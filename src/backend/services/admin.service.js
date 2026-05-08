import { randomUUID } from 'crypto';
import Workshop from '../models/workshop.model.js';
import Admin from '../models/admin.model.js';
import Checkin from '../models/checkin.model.js';
import Registration from '../models/registration.model.js';
import CsvSyncService from './csv-sync.service.js';
import storage from '../config/storage.js';
import { config } from '../config/config.js';
import { publishEvent } from '../config/rabbitmq.js';

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
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) throw { status: 404, message: 'Workshop not found' };

    await Workshop.softDelete(workshopId);
    await Admin.insertAuditLog({
      actorId,
      entityId: workshopId,
      action: 'CANCEL_WORKSHOP',
      entityType: 'workshops',
      oldPayload: { status: workshop.status, deleted_at: workshop.deleted_at || null },
      newPayload: { status: 'CANCELLED', deleted_at: new Date().toISOString() },
    });

    return { id: workshopId, status: 'CANCELLED' };
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
}

export default AdminService;
