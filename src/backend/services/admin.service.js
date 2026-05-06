import { randomUUID } from 'crypto';
import db from '../config/db.js';

function parseDateFallback(dateString) {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  return parsed;
}

export class AdminService {
  static async createWorkshop(payload) {
    const room = await db('rooms').select('id').orderBy('created_at', 'asc').first();
    if (!room) throw { status: 400, message: 'No room configured in database' };

    const startTime = parseDateFallback(payload.date);
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

    const [workshop] = await db('workshops')
      .insert({
        id: randomUUID(),
        room_id: room.id,
        title: payload.title,
        description: payload.speaker ? `Speaker: ${payload.speaker}` : 'Workshop created from admin UI',
        cover_image_url: null,
        start_time: startTime,
        end_time: endTime,
        capacity: Number(payload.totalSeats || 60),
        registered_count: 0,
        price: Number(payload.fee || 0),
        status: 'DRAFT',
      })
      .returning(['id', 'title', 'status']);

    return workshop;
  }

  static async cancelWorkshop(workshopId, actorId) {
    const workshop = await db('workshops').where({ id: workshopId }).first();
    if (!workshop) throw { status: 404, message: 'Workshop not found' };

    await db('workshops').where({ id: workshopId }).update({ status: 'CANCELLED', updated_at: db.fn.now() });
    await db('audit_logs').insert({
      id: randomUUID(),
      actor_id: actorId,
      entity_id: workshopId,
      action: 'CANCEL_WORKSHOP',
      entity_type: 'workshops',
      old_payload: JSON.stringify({ status: workshop.status }),
      new_payload: JSON.stringify({ status: 'CANCELLED' }),
    });
  }

  static async uploadDocument(workshopId, fileName) {
    const workshop = await db('workshops').where({ id: workshopId }).first();
    if (!workshop) throw { status: 404, message: 'Workshop not found' };

    const existing = await db('documents').where({ workshop_id: workshopId }).first();
    if (existing) {
      await db('documents').where({ id: existing.id }).update({
        pdf_url: `https://cdn.unihub.local/${fileName || 'workshop.pdf'}`,
        process_status: 'PENDING',
        updated_at: db.fn.now(),
      });
      return { id: existing.id, process_status: 'PENDING' };
    }

    const [created] = await db('documents')
      .insert({
        id: randomUUID(),
        workshop_id: workshopId,
        pdf_url: `https://cdn.unihub.local/${fileName || 'workshop.pdf'}`,
        ai_summary: null,
        process_status: 'PENDING',
      })
      .returning(['id', 'process_status']);

    return created;
  }

  static async getAnalytics() {
    const [active] = await db('workshops').where({ status: 'PUBLISHED' }).whereNull('deleted_at').count('* as count');
    const [{ seats_left: seatsLeft }] = await db('workshops')
      .where({ status: 'PUBLISHED' })
      .whereNull('deleted_at')
      .sum(db.raw('GREATEST(capacity - registered_count, 0) as seats_left'));
    const [aiDone] = await db('documents').where({ process_status: 'COMPLETED' }).count('* as count');

    return {
      activeCount: Number(active?.count || 0),
      seatsLeft: Number(seatsLeft || 0),
      aiCompleted: Number(aiDone?.count || 0),
    };
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
}

export default AdminService;
