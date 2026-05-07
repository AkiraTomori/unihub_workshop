import Notification from '../models/notification.model.js';

export class NotificationService {
  static async listMyNotifications(userId) {
    const rows = await Notification.listByUser(userId);

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
