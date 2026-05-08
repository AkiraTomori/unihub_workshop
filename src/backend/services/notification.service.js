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

  static async getFailedNotificationsList() {
    const failedNotifications = await Notification.getFailedNotifications();
    return failedNotifications.map(n => ({
      id: n.id,
      channel: n.channel,
      subject: n.subject,
      content: n.content,
      recipient: n.recipient,
      status: n.status,
      created_at: n.created_at,
    }));
  }

  static async replayFailedNotifications(notificationIds = null) {
    let failedNotifications;
    
    if (notificationIds && notificationIds.length > 0) {
      // Replay only selected notifications
      failedNotifications = await Notification.getFailedNotifications();
      failedNotifications = failedNotifications.filter(n => notificationIds.includes(n.id));
    } else {
      // Replay all failed notifications
      failedNotifications = await Notification.getFailedNotifications();
    }

    if (failedNotifications.length === 0) {
      return {
        replayed: 0,
        failed: 0,
      };
    }

    // Mark selected failed notifications as PENDING to retry
    const notifIds = failedNotifications.map(n => n.id);
    await Notification.updateMultipleStatus(notifIds, 'PENDING');

    // In a real scenario, you would integrate with your messaging service here
    // For now, we just mark them as pending for retry by the worker
    return {
      replayed: failedNotifications.length,
      failed: 0,
    };
  }
}

export default NotificationService;
