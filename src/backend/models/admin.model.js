import { randomUUID } from 'crypto';
import db from '../config/db.js';

export class Admin {
  static async findFirstRoomId() {
    const room = await db('rooms').select('id').orderBy('created_at', 'asc').first();
    return room?.id || null;
  }

  static async listRooms() {
    return db('rooms').select('id', 'name', 'base_capacity').orderBy('name', 'asc');
  }

  static async getRoomById(roomId) {
    return db('rooms').select('id', 'name', 'base_capacity').where({ id: roomId }).first();
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

  static async insertWorkshopAuditLog({ actorId, workshopId, oldStatus, newStatus }) {
    await db('audit_logs').insert({
      id: randomUUID(),
      actor_id: actorId,
      entity_id: workshopId,
      action: 'CANCEL_WORKSHOP',
      entity_type: 'workshops',
      old_payload: JSON.stringify({ status: oldStatus }),
      new_payload: JSON.stringify({ status: newStatus }),
    });
  }
}

export default Admin;