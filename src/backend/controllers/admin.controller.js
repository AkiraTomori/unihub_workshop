import AdminService from '../services/admin.service.js';

export class AdminController {
  static async createWorkshop(req, res) {
    try {
      const { title } = req.body;
      if (!title?.trim()) {
        return res.status(400).json({ status: 'VALIDATION_ERROR', message: 'title is required' });
      }
      const result = await AdminService.createWorkshop(req.body);
      return res.status(201).json(result);
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to create workshop',
      });
    }
  }

  static async cancelWorkshop(req, res) {
    try {
      await AdminService.cancelWorkshop(req.params.workshopId, req.user.id);
      return res.status(200).json({ status: 'SUCCESS', message: 'Workshop cancelled' });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to cancel workshop',
      });
    }
  }

  static async uploadDocument(req, res) {
    try {
      const { workshopId, fileName } = req.body;
      if (!workshopId) {
        return res.status(400).json({ status: 'VALIDATION_ERROR', message: 'workshopId is required' });
      }
      const result = await AdminService.uploadDocument(workshopId, fileName);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to upload document',
      });
    }
  }

  static async analytics(req, res) {
    try {
      const result = await AdminService.getAnalytics();
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to fetch analytics',
      });
    }
  }

  static async csvLatest(req, res) {
    try {
      const result = await AdminService.getLatestCsvSync();
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to fetch csv sync log',
      });
    }
  }
}

export default AdminController;
