import db from '../config/db.js';

export class Notification {
  static async listByUser(userId) {
    return db('notifications')
      .where({ user_id: userId })
      .orderByRaw('CASE WHEN read_at IS NULL THEN 0 ELSE 1 END ASC')
      .orderBy('created_at', 'desc')
      .limit(50)
      .select('id', 'channel', 'template', 'subject', 'content', 'recipient', 'status', 'read_at', 'created_at');
  }

  static async getFailedNotifications() {
    return db('notifications')
      .where({ status: 'FAILED' })
      .orderBy('created_at', 'asc')
      .select('id', 'user_id', 'channel', 'subject', 'content', 'recipient', 'status', 'created_at');
  }

  static async updateStatus(notificationId, newStatus) {
    await db('notifications')
      .where({ id: notificationId })
      .update({
        status: newStatus,
        updated_at: db.fn.now(),
      });
  }

  static async markAsRead(notificationId, userId) {
    const [updated] = await db('notifications')
      .where({ id: notificationId, user_id: userId })
      .whereNull('read_at')
      .update({
        read_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning(['id', 'read_at']);

    return updated || null;
  }

  static async updateMultipleStatus(notificationIds, newStatus) {
    await db('notifications')
      .whereIn('id', notificationIds)
      .update({
        status: newStatus,
        updated_at: db.fn.now(),
      });
  }
}

export default Notification;