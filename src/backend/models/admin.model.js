import { randomUUID } from 'crypto';
import db from '../config/db.js';

export class Admin {
  static async insertAuditLog({ actorId = null, entityId, action, entityType, oldPayload = null, newPayload = null }) {
    await db('audit_logs').insert({
      id: randomUUID(),
      actor_id: actorId,
      entity_id: entityId,
      action,
      entity_type: entityType,
      old_payload: oldPayload,
      new_payload: newPayload,
    });
  }

  static async findFirstRoomId() {
    const room = await db('rooms').select('id').orderBy('created_at', 'asc').first();
    return room?.id || null;
  }

  static async listRooms() {
    return db('rooms').select('id', 'name', 'base_capacity').where('is_active', true).orderBy('name', 'asc');
  }

  static async getRoomById(roomId) {
    return db('rooms').select('id', 'name', 'base_capacity').where({ id: roomId }).where('is_active', true).first();
  }

  static async createRoom({ id = null, name, base_capacity = 0, map_image_url = null }) {
    const payload = {
      id: id || randomUUID(),
      name,
      base_capacity: Number(base_capacity || 0),
      map_image_url: map_image_url || null,
    };

    const [{ id: createdId, name: createdName, base_capacity: createdCapacity }] = await db('rooms')
      .insert(payload)
      .returning(['id', 'name', 'base_capacity']);

    return { id: createdId, name: createdName, base_capacity: createdCapacity };
  }

  static async updateRoom(roomId, { name, base_capacity, map_image_url }) {
    const payload = {};
    if (name !== undefined) payload.name = name;
    if (base_capacity !== undefined) payload.base_capacity = Number(base_capacity);
    if (map_image_url !== undefined) payload.map_image_url = map_image_url;

    const updated = await db('rooms').where({ id: roomId }).update(payload).returning(['id', 'name', 'base_capacity']);
    if (!updated || updated.length === 0) return null;
    const row = updated[0];
    return { id: row.id, name: row.name, base_capacity: row.base_capacity };
  }

  static async deleteRoom(roomId) {
    const updated = await db('rooms').where({ id: roomId }).update({ is_active: false }).returning(['id', 'name', 'is_active']);
    if (!updated || updated.length === 0) return null;
    const row = updated[0];
    return { id: row.id, name: row.name, is_active: row.is_active };
  }

  static async restoreRoom(roomId) {
    const updated = await db('rooms').where({ id: roomId }).update({ is_active: true }).returning(['id', 'name', 'is_active']);
    if (!updated || updated.length === 0) return null;
    const row = updated[0];
    return { id: row.id, name: row.name, is_active: row.is_active };
  }

  static async listDeletedRooms() {
    return db('rooms').select('id', 'name', 'base_capacity').where('is_active', false).orderBy('updated_at', 'desc');
  }

  static async upsertDocument(workshopId, fileName) {
    const existing = await db('documents').where({ workshop_id: workshopId }).first();

    const payload = {
      pdf_url: `https://cdn.unihub.local/${fileName || 'workshop.pdf'}`,
      process_status: 'PENDING',
      updated_at: db.fn.now(),
    };

    if (existing) {
      await db('documents').where({ id: existing.id }).update(payload);
      return { id: existing.id, process_status: 'PENDING' };
    }

    const [{ id }] = await db('documents')
      .insert({
        workshop_id: workshopId,
        pdf_url: payload.pdf_url,
        ai_summary: null,
        process_status: 'PENDING',
      })
      .returning(['id']);

    return { id, process_status: 'PENDING' };
  }

  static async getLatestCsvSync() {
    const row = await db('csv_sync_logs').orderBy('created_at', 'desc').first();
    if (!row) {
      return {
        ran_at: new Date().toISOString(),
        processed_rows: 0,
        invalid_rows: 0,
        upsert_conflicts: 0,
      };
    }

    return {
      ran_at: row.created_at,
      processed_rows: Number(row.total_rows || 0),
      invalid_rows: Math.max(0, Number(row.total_rows || 0) - Number(row.success_rows || 0)),
      upsert_conflicts: 0,
    };
  }

  static async getWorkshopPublishedAnalytics() {
    const [active] = await db('workshops').where({ status: 'PUBLISHED' }).whereNull('deleted_at').count('* as count');
    const seatsResult = await db('workshops')
      .where({ status: 'PUBLISHED' })
      .whereNull('deleted_at')
      .select(db.raw('COALESCE(SUM(GREATEST(capacity - registered_count, 0)), 0) as seats_left'))
      .first();
    const [aiDone] = await db('documents').where({ process_status: 'COMPLETED' }).count('* as count');

    return {
      activeCount: Number(active?.count || 0),
      seatsLeft: Number(seatsResult?.seats_left || 0),
      aiCompleted: Number(aiDone?.count || 0),
    };
  }

  static async getAuditLogs({ page = 1, limit = 20, entityType = null, action = null } = {}) {
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.max(1, Number(limit) || 20);
    const offset = (pageNumber - 1) * pageSize;

    const baseQuery = db('audit_logs as a')
      .leftJoin('users as u', 'a.actor_id', 'u.id')
      .select(
        'a.id',
        'a.actor_id',
        'u.full_name as actor_name',
        'u.email as actor_email',
        'a.entity_id',
        'a.action',
        'a.entity_type',
        'a.old_payload',
        'a.new_payload',
        'a.created_at'
      )
      .orderBy('a.created_at', 'desc')
      .offset(offset)
      .limit(pageSize);

    if (entityType) {
      baseQuery.where('a.entity_type', entityType);
    }

    if (action) {
      baseQuery.where('a.action', action);
    }

    const countQuery = db('audit_logs as a');
    if (entityType) {
      countQuery.where('a.entity_type', entityType);
    }
    if (action) {
      countQuery.where('a.action', action);
    }

    const [countRow] = await countQuery.count('* as count');
    const rows = await baseQuery;

    return {
      data: rows.map((row) => ({
        id: row.id,
        actor_id: row.actor_id,
        actor_name: row.actor_name,
        actor_email: row.actor_email,
        entity_id: row.entity_id,
        action: row.action,
        entity_type: row.entity_type,
        old_payload: row.old_payload,
        new_payload: row.new_payload,
        created_at: row.created_at,
      })),
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total: Number(countRow?.count || 0),
        totalPages: Math.max(1, Math.ceil(Number(countRow?.count || 0) / pageSize)),
      },
    };
  }

  static async getDocumentByWorkshopId(workshopId) {
    return db('documents')
      .select('id', 'workshop_id', 'pdf_url', 'ai_summary', 'process_status', 'created_at', 'updated_at')
      .where({ workshop_id: workshopId })
      .first();
  }

  static async upsertDocumentWithUrl(workshopId, pdfUrl) {
    const existing = await db('documents').where({ workshop_id: workshopId }).first();

    if (existing) {
      await db('documents')
        .where({ id: existing.id })
        .update({
          pdf_url: pdfUrl,
          process_status: 'PENDING',
          updated_at: db.fn.now(),
        });
      return existing.id;
    }

    const [{ id }] = await db('documents')
      .insert({
        workshop_id: workshopId,
        pdf_url: pdfUrl,
        ai_summary: null,
        process_status: 'PENDING',
      })
      .returning(['id']);

    return id;
  }

  static async updateDocumentStatus(documentId, status, aiSummary = null) {
    const payload = {
      process_status: status,
      updated_at: db.fn.now(),
    };

    if (aiSummary) {
      payload.ai_summary = aiSummary;
    }

    await db('documents').where({ id: documentId }).update(payload);
    return { id: documentId, process_status: status };
  }
}

export default Admin;