import { randomUUID } from 'crypto';
import Workshop from '../models/workshop.model.js';
import Admin from '../models/admin.model.js';
import Checkin from '../models/checkin.model.js';
import Registration from '../models/registration.model.js';
import Refund from '../models/refund.model.js';
import RefundService from './refund.service.js';
import CsvSyncService from './csv-sync.service.js';
import storage from '../config/storage.js';
import { config } from '../config/config.js';
import { publishEvent } from '../config/rabbitmq.js';
import db from '../config/db.js';

function parseDateFallback(dateString) {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  return parsed;
}

function parseDateInput(value, fallback) {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return fallback;
}

function ensureRoomCapacity(room, totalSeats) {
  if (!room) {
    throw { status: 400, message: 'Room not found' };
  }

  const seats = Number(totalSeats || 0);
  const capacity = Number(room.base_capacity || 0);
  if (seats > capacity) {
    throw {
      status: 400,
      message: `Room capacity must be greater than or equal to workshop seats (${capacity} < ${seats})`,
    };
  }
}

export class AdminService {
  static async uploadCsvSyncFile(actorId, fileBuffer, originalFileName) {
    const result = await CsvSyncService.saveUploadedCsvFile(fileBuffer, originalFileName);
    await Admin.insertAuditLog({
      actorId,
      entityId: randomUUID(),
      action: 'UPLOAD_CSV_SYNC_FILE',
      entityType: 'csv_sync_logs',
      oldPayload: null,
      newPayload: result,
    });
    return result;
  }

  static async createWorkshop(actorId, payload) {
    const roomId = payload.room_id || (await Admin.findFirstRoomId());
    if (!roomId) throw { status: 400, message: 'No room configured in database' };
    const room = await Admin.getRoomById(roomId);
    ensureRoomCapacity(room, payload.totalSeats);

    const startTime = parseDateInput(payload.start_time, parseDateFallback(payload.date));
    const endTime = parseDateInput(payload.end_time, new Date(startTime.getTime() + 2 * 60 * 60 * 1000));

    const workshop = await Workshop.create({
      room_id: roomId,
      title: payload.title,
      description: payload.description || null,
      speaker: payload.speaker || null,
      cover_image_url: null,
      start_time: startTime,
      end_time: endTime,
      capacity: Number(payload.totalSeats || 60),
      price: Number(payload.fee || 0),
      status: 'DRAFT',
    });

    await Admin.insertAuditLog({
      actorId,
      entityId: workshop.id,
      action: 'CREATE_WORKSHOP',
      entityType: 'workshops',
      oldPayload: null,
      newPayload: {
        title: workshop.title,
        room_id: roomId,
        totalSeats: Number(payload.totalSeats || 60),
        fee: Number(payload.fee || 0),
        status: 'DRAFT',
      },
    });

    return { id: workshop.id, title: workshop.title, status: workshop.status };
  }

  static async listWorkshops(query = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.max(1, Number(query.pageSize) || 10);
    const offset = (page - 1) * pageSize;

    const [total, rows] = await Promise.all([
      Workshop.countAdmin(),
      Workshop.findAdminList({ offset, limit: pageSize }),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        title: row.title,
        speaker: row.speaker || null,
        room: row.room_name || 'TBD',
        date: row.start_time ? new Date(row.start_time).toLocaleString() : 'TBD',
        seatsLeft: Math.max(0, Number(row.capacity || 0) - Number(row.registered_count || 0)),
        totalSeats: Number(row.capacity || 0),
        fee: Number(row.price || 0),
        status: row.status,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        hasPrevPage: page > 1,
        hasNextPage: page * pageSize < total,
      },
    };
  }

  static async getWorkshopById(workshopId) {
    const workshop = await Workshop.findAnyById(workshopId);
    if (!workshop) throw { status: 404, message: 'Workshop not found' };

    return {
      id: workshop.id,
      title: workshop.title,
      speaker: workshop.speaker || null,
      description: workshop.description || '',
      room_id: workshop.room_id,
      room: workshop.room_name || 'TBD',
      start_time: workshop.start_time,
      end_time: workshop.end_time,
      totalSeats: Number(workshop.capacity || 0),
      fee: Number(workshop.price || 0),
      status: workshop.status,
      deleted_at: workshop.deleted_at,
    };
  }

  static async updateWorkshop(actorId, workshopId, payload) {
    const current = await Workshop.findAnyById(workshopId);
    if (!current) throw { status: 404, message: 'Workshop not found' };

    const roomId = payload.room_id || current.room_id;
    const room = await Admin.getRoomById(roomId);
    const seats = payload.totalSeats !== undefined ? payload.totalSeats : current.capacity;
    ensureRoomCapacity(room, seats);

    const updated = await Workshop.update(workshopId, {
      room_id: payload.room_id,
      title: payload.title,
      description: payload.description,
      speaker: payload.speaker,
      start_time: payload.start_time,
      end_time: payload.end_time,
      capacity: payload.totalSeats,
      price: payload.fee,
      status: payload.status,
    });

    if (!updated) throw { status: 404, message: 'Workshop not found' };

    await Admin.insertAuditLog({
      actorId,
      entityId: workshopId,
      action: 'UPDATE_WORKSHOP',
      entityType: 'workshops',
      oldPayload: {
        title: current.title,
        room_id: current.room_id,
        totalSeats: Number(current.capacity || 0),
        fee: Number(current.price || 0),
        status: current.status,
      },
      newPayload: {
        title: updated.title,
        room_id: updated.room_id,
        totalSeats: Number(updated.capacity || 0),
        fee: Number(updated.price || 0),
        status: updated.status,
      },
    });
    return updated;
  }

  static async cancelWorkshop(workshopId, actorId) {
    return db.transaction(async (trx) => {
      const workshop = await Workshop.findById(workshopId);
      if (!workshop) throw { status: 404, message: 'Workshop not found' };

      // Soft delete workshop
      await Workshop.softDelete(workshopId);

      // Refund all paid registrations
      const refundSummary = await RefundService.refundWorkshopPaymentsWithinTrx(
        trx,
        workshopId,
        'Workshop canceled by admin'
      );

      // Cancel remaining registrations (including unpaid/free) and notify all registrants
      const registrations = await Registration.listByWorkshop(workshopId, trx);
      for (const reg of registrations) {
        // Ensure registration is cancelled
        if (reg.status !== 'CANCELLED') {
          await Refund.cancelRegistration(trx, reg.id);

          // If registration had no successful payment, decrement seat count now
          if (reg.payment_status !== 'SUCCESS') {
            await Refund.decrementWorkshopRegisteredCount(trx, workshopId);
          }

          // Enqueue cancellation notification for this registrant
          const subject = `Workshop cancelled: ${workshop.title}`;
          const content = `Hello ${reg.full_name || 'participant'},\n\nWe regret to inform you that the workshop "${workshop.title}" scheduled on ${workshop.start_time ? new Date(workshop.start_time).toLocaleString() : 'TBD'} has been cancelled by the organiser.\n\nIf you have a paid registration, a refund has been or will be processed. For questions, contact support.`;

          await Registration.enqueueWorkshopCancellation(trx, {
            userId: reg.user_id,
            recipient: reg.email,
            subject,
            content,
            registrationId: reg.id,
            workshopId: workshopId,
            workshopTitle: workshop.title,
            workshopStartTime: workshop.start_time,
            workshopSpeaker: workshop.speaker,
            workshopRoomName: workshop.room_name,
            reason: 'Workshop canceled by admin',
          });
        }
      }

      // Audit log with refund summary
      await Admin.insertAuditLog({
        actorId,
        entityId: workshopId,
        action: 'CANCEL_WORKSHOP',
        entityType: 'workshops',
        oldPayload: { status: workshop.status, deleted_at: workshop.deleted_at || null },
        newPayload: {
          status: 'CANCELLED',
          deleted_at: new Date().toISOString(),
          refund_summary: refundSummary,
        },
      });

      return {
        id: workshopId,
        status: 'CANCELLED',
        refundSummary,
      };
    });
  }

  static async listDeletedWorkshops() {
    const rows = await Workshop.findDeletedList();
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      speaker: row.speaker || null,
      room: row.room_name || 'TBD',
      date: row.start_time ? new Date(row.start_time).toLocaleString() : 'TBD',
      deleted_at: row.deleted_at,
      status: row.status,
    }));
  }

  static async restoreWorkshop(workshopId, actorId) {
    const workshop = await Workshop.findAnyById(workshopId);
    if (!workshop || !workshop.deleted_at) {
      throw { status: 404, message: 'Deleted workshop not found' };
    }

    const restored = await Workshop.restore(workshopId);
    await Admin.insertAuditLog({
      actorId,
      entityId: workshopId,
      action: 'RESTORE_WORKSHOP',
      entityType: 'workshops',
      oldPayload: { status: workshop.status, deleted_at: workshop.deleted_at },
      newPayload: { status: restored?.status || 'DRAFT', deleted_at: null },
    });

    return restored;
  }

  static async uploadDocument(actorId, workshopId, fileBuffer, originalFileName) {
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) throw { status: 404, message: 'Workshop not found' };

    if (!fileBuffer) throw { status: 400, message: 'No file provided' };

    // Validate file type
    if (!originalFileName.toLowerCase().endsWith('.pdf')) {
      throw { status: 400, message: 'Only PDF files are allowed' };
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (fileBuffer.length > maxSize) {
      throw { status: 400, message: `File size exceeds limit of ${maxSize / 1024 / 1024}MB` };
    }

    try {
      // Generate unique file name for Supabase
      const timestamp = Date.now();
      const fileName = `${workshopId}-${timestamp}-${originalFileName}`;
      const bucket = config.storage.documentBucket;

      // Upload to Supabase
      const uploadResult = await storage.uploadDocument(bucket, fileName, fileBuffer, 'application/pdf');

      // Store in database
      const documentId = await Admin.upsertDocumentWithUrl(workshopId, uploadResult.url);

      await Admin.insertAuditLog({
        actorId,
        entityId: documentId,
        action: 'UPLOAD_DOCUMENT',
        entityType: 'documents',
        oldPayload: null,
        newPayload: {
          workshopId,
          pdfUrl: uploadResult.url,
          fileName: originalFileName,
          processStatus: 'PENDING',
        },
      });

      return {
        status: 'SUCCESS',
        message: 'Document uploaded. Click AI Summary to start processing.',
        data: {
          workshopId,
          pdfUrl: uploadResult.url,
          processStatus: 'PENDING',
        },
      };
    } catch (error) {
      throw { status: 500, message: `Upload failed: ${error.message}` };
    }
  }

  static async getDocument(workshopId) {
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) throw { status: 404, message: 'Workshop not found' };

    const document = await Admin.getDocumentByWorkshopId(workshopId);
    if (!document) return null;

    return {
      id: document.id,
      workshopId: document.workshop_id,
      pdfUrl: document.pdf_url,
      aiSummary: document.ai_summary,
      processStatus: document.process_status,
      createdAt: document.created_at,
      updatedAt: document.updated_at,
    };
  }

  static async startDocumentSummary(actorId, workshopId) {
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) throw { status: 404, message: 'Workshop not found' };

    const document = await Admin.getDocumentByWorkshopId(workshopId);
    if (!document) throw { status: 404, message: 'Document not found' };

    try {
      await publishEvent('document.uploaded', {
        workshopId,
        documentId: document.id,
        pdfUrl: document.pdf_url,
        createdAt: new Date().toISOString(),
      });

      await Admin.insertAuditLog({
        actorId,
        entityId: document.id,
        action: 'START_DOCUMENT_SUMMARY',
        entityType: 'documents',
        oldPayload: { processStatus: document.process_status },
        newPayload: { processStatus: 'PENDING' },
      });

      console.log(`[AdminService] Published DocumentUploaded event for document ${document.id}`);

      return {
        status: 'SUCCESS',
        message: 'AI summary processing started.',
        data: {
          workshopId,
          documentId: document.id,
          processStatus: 'PENDING',
        },
      };
    } catch (error) {
      console.error(`[AdminService] Failed to publish event: ${error.message}`);
      throw { status: 500, message: `Failed to start AI summary: ${error.message}` };
    }
  }

  static async getAnalytics() {
    return Admin.getWorkshopPublishedAnalytics();
  }

  static async getLatestCsvSync() {
    return Admin.getLatestCsvSync();
  }

  static async listRooms() {
    return Admin.listRooms();
  }

  static async createRoom(actorId, payload) {
    const room = await Admin.createRoom({ name: payload.name, base_capacity: payload.base_capacity, map_image_url: payload.map_image_url });
    await Admin.insertAuditLog({
      actorId,
      entityId: room.id,
      action: 'CREATE_ROOM',
      entityType: 'rooms',
      oldPayload: null,
      newPayload: room,
    });
    return room;
  }

  static async updateRoom(actorId, roomId, payload) {
    const current = await Admin.getRoomById(roomId);
    if (!current) throw { status: 404, message: 'Room not found' };

    const updated = await Admin.updateRoom(roomId, {
      name: payload.name,
      base_capacity: payload.base_capacity,
      map_image_url: payload.map_image_url,
    });

    await Admin.insertAuditLog({
      actorId,
      entityId: roomId,
      action: 'UPDATE_ROOM',
      entityType: 'rooms',
      oldPayload: current,
      newPayload: updated,
    });

    return updated;
  }

  static async deleteRoom(actorId, roomId) {
    const current = await Admin.getRoomById(roomId);
    if (!current) throw { status: 404, message: 'Room not found' };

    // Check if room is used in active workshops
    const workshopsCount = await db('workshops')
      .where('room_id', roomId)
      .where('status', 'PUBLISHED')
      .whereNull('deleted_at')
      .count({ total: '*' })
      .first();

    if (workshopsCount?.total > 0) {
      throw { status: 400, message: 'Cannot delete room with active workshops' };
    }

    const deleted = await Admin.deleteRoom(roomId);

    await Admin.insertAuditLog({
      actorId,
      entityId: roomId,
      action: 'DELETE_ROOM',
      entityType: 'rooms',
      oldPayload: current,
      newPayload: { ...current, is_active: false },
    });

    return deleted;
  }

  static async restoreRoom(actorId, roomId) {
    // Check if room exists (including inactive)
    const room = await db('rooms').where({ id: roomId }).select('id', 'name', 'is_active').first();
    if (!room) throw { status: 404, message: 'Room not found' };
    if (room.is_active) throw { status: 400, message: 'Room is already active' };

    const restored = await Admin.restoreRoom(roomId);

    await Admin.insertAuditLog({
      actorId,
      entityId: roomId,
      action: 'RESTORE_ROOM',
      entityType: 'rooms',
      oldPayload: { ...room, is_active: false },
      newPayload: restored,
    });

    return restored;
  }

  static async listDeletedRooms() {
    return Admin.listDeletedRooms();
  }

  static async getRoomWorkshops(roomId) {
    const workshops = await db('workshops')
      .where({ room_id: roomId })
      .select('id', 'title', 'status', 'room_id', 'created_at')
      .orderBy('created_at', 'desc');
    return workshops || [];
  }

  static async updateDocumentStatus(documentId, status, aiSummary = null) {
    return Admin.updateDocumentStatus(documentId, status, aiSummary);
  }

  static async getWorkshopRegistrations(workshopId) {
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) throw { status: 404, message: 'Workshop not found' };

    const registrations = await Registration.listByWorkshop(workshopId);
    return {
      workshopId,
      workshopTitle: workshop.title,
      totalRegistrations: registrations.length,
      registrations: registrations.map((r) => ({
        id: r.id,
        userId: r.user_id,
        fullName: r.full_name,
        email: r.email,
        studentCode: r.student_code,
        status: r.status,
        paymentId: r.payment_id || null,
        paymentStatus: r.payment_status || null,
        registeredAt: r.created_at,
      })),
    };
  }

  static async getCheckinStats() {
    return await Checkin.getCheckinStats();
  }

  static async triggerCsvSync(actorId) {
    const csvPath = config.csvSync.filePath || CsvSyncService.getLatestCsvStoragePath();
    
    try {
      const result = await CsvSyncService.runSync(csvPath);
      await Admin.insertAuditLog({
        actorId,
        entityId: result?.data?.logId || randomUUID(),
        action: 'TRIGGER_CSV_SYNC',
        entityType: 'csv_sync_logs',
        oldPayload: null,
        newPayload: result,
      });
      return result;
    } catch (error) {
      return {
        status: 'ERROR',
        message: error.message || 'CSV sync failed',
      };
    }
  }

  static async getCsvSyncLogs(page = 1, limit = 20) {
    try {
      const result = await CsvSyncService.getAllLogs(page, limit);
      return result;
    } catch (error) {
      throw { status: 500, message: error.message || 'Failed to fetch CSV sync logs' };
    }
  }

  static async getAuditLogs(query = {}) {
    return Admin.getAuditLogs(query);
  }

  static async listStudents(query = {}) {
    return Admin.listStudents({
      page: query.page || 1,
      pageSize: query.pageSize || 10,
    });
  }
}

export default AdminService;
