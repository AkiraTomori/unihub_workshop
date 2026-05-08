import CheckinService from '../services/checkin.service.js';

export class CheckinController {
  static async scan(req, res) {
    try {
      const qrCode = req.body?.qrCode;
      const deviceId = req.body?.deviceId || 'mobile-checker';
      const result = await CheckinService.scanByQr(qrCode, deviceId);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to verify QR',
      });
    }
  }

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

  static async listMine(req, res) {
    try {
      const result = await CheckinService.listMyCheckins(req.user.id);
      return res.status(200).json({ data: result });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to fetch check-ins',
      });
    }
  }
}

export default CheckinController;
