import CheckinService from '../services/checkin.service.js';

export class CheckinController {
  static async sync(req, res) {
    try {
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      const result = await CheckinService.sync(items);
      return res.status(200).json({ items: result });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to sync checkins',
      });
    }
  }
}

export default CheckinController;
