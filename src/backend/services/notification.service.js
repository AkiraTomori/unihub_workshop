import Notification from '../models/notification.model.js';
import { publishEvent } from '../config/rabbitmq.js';
import { randomUUID } from 'crypto';

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

    const replayableNotifications = failedNotifications.filter((notification) => notification.channel === 'EMAIL');
    const skippedCount = failedNotifications.length - replayableNotifications.length;

    if (replayableNotifications.length === 0) {
      return {
        replayed: 0,
        failed: skippedCount,
      };
    }

    // Mark selected email notifications as PENDING to retry
    const notifIds = replayableNotifications.map(n => n.id);
    await Notification.updateMultipleStatus(notifIds, 'PENDING');

    // Publish each notification so the worker can resend via SMTP
    await Promise.all(
      replayableNotifications.map((notification) =>
        publishEvent('notification.requested', {
          event_id: randomUUID(),
          event_type: 'NotificationRequested',
          occurred_at: new Date().toISOString(),
          aggregate_id: notification.id,
          correlation_id: notification.id,
          trace_id: `replay-${notification.id}`,
          payload: {
            notification_id: notification.id,
            user_id: notification.user_id,
            channel: notification.channel,
            template: notification.template,
            subject: notification.subject,
            content: notification.content,
            recipient: notification.recipient,
          },
        })
      )
    );

    return {
      replayed: replayableNotifications.length,
      failed: skippedCount,
    };
  }
}

export default NotificationService;
