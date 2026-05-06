import db from '../config/db.js';

export class NotificationService {
  static async listMyNotifications(userId) {
    const rows = await db('notifications')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(50)
      .select('id', 'channel', 'subject', 'content', 'status', 'created_at');

    return rows.map((row) => ({
      id: row.id,
      channel: row.channel,
      title: row.subject,
      message: row.content || '',
      status: row.status,
      created_at: row.created_at,
    }));
  }
}

export default NotificationService;
