import NotificationService from '../services/notification.service.js';

export class NotificationController {
  static async listMine(req, res) {
    try {
      const rows = await NotificationService.listMyNotifications(req.user.id);
      return res.status(200).json(rows);
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to fetch notifications',
      });
    }
  }

  static async markRead(req, res) {
    try {
      const { id } = req.params;
      const result = await NotificationService.markNotificationAsRead(req.user.id, id);
      return res.status(200).json({ data: result });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to mark notification as read',
      });
    }
  }

  static async getFailedNotificationsList(req, res) {
    try {
      const notifications = await NotificationService.getFailedNotificationsList();
      return res.status(200).json({ data: notifications });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to fetch failed notifications',
      });
    }
  }

  static async replayFailedNotifications(req, res) {
    try {
      const { notificationIds } = req.body;
      const result = await NotificationService.replayFailedNotifications(notificationIds);
      return res.status(200).json({ data: result });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to replay notifications',
      });
    }
  }
}

export default NotificationController;
