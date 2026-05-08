import db from '../config/db.js';

export class Outbox {
  static async listPending(limit = 20) {
    return db('outbox_events')
      .where({ status: 'PENDING' })
      .orderBy('created_at', 'asc')
      .limit(limit)
      .select('id', 'event_type', 'payload');
  }

  static async markPublished(id) {
    await db('outbox_events')
      .where({ id })
      .update({
        status: 'PUBLISHED',
        updated_at: db.fn.now(),
      });
  }

  static async markFailed(id) {
    await db('outbox_events')
      .where({ id })
      .update({
        status: 'FAILED',
        updated_at: db.fn.now(),
      });
  }
}

export default Outbox;