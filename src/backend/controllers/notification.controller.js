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
}

export default NotificationController;
