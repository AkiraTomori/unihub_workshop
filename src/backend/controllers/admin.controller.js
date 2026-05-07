import AdminService from '../services/admin.service.js';

export class AdminController {
  static async listWorkshops(req, res) {
    try {
      const result = await AdminService.listWorkshops(req.query || {});
      return res.status(200).json({ status: 'SUCCESS', message: 'Admin workshops retrieved successfully', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({ status: 'ERROR', message: error.message || 'Failed to fetch workshops' });
    }
  }

  static async getWorkshopById(req, res) {
    try {
      const result = await AdminService.getWorkshopById(req.params.id);
      return res.status(200).json({ status: 'SUCCESS', message: 'Workshop retrieved successfully', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({ status: 'ERROR', message: error.message || 'Failed to fetch workshop detail' });
    }
  }

  static async createWorkshop(req, res) {
    try {
      const result = await AdminService.createWorkshop(req.body);
      return res.status(201).json({ status: 'SUCCESS', message: 'Workshop created successfully', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({ status: 'ERROR', message: error.message || 'Failed to create workshop' });
    }
  }

  static async updateWorkshop(req, res) {
    try {
      const result = await AdminService.updateWorkshop(req.params.id, req.body);
      return res.status(200).json({ status: 'SUCCESS', message: 'Workshop updated successfully', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({ status: 'ERROR', message: error.message || 'Failed to update workshop' });
    }
  }

  static async cancelWorkshop(req, res) {
    try {
      const result = await AdminService.cancelWorkshop(req.params.workshopId, req.user.id);
      return res.status(200).json({ status: 'SUCCESS', message: 'Workshop cancelled', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to cancel workshop',
      });
    }
  }

  static async listDeletedWorkshops(_req, res) {
    try {
      const result = await AdminService.listDeletedWorkshops();
      return res.status(200).json({ status: 'SUCCESS', message: 'Deleted workshops retrieved successfully', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({ status: 'ERROR', message: error.message || 'Failed to fetch deleted workshops' });
    }
  }

  static async restoreWorkshop(req, res) {
    try {
      const result = await AdminService.restoreWorkshop(req.params.workshopId, req.user.id);
      return res.status(200).json({ status: 'SUCCESS', message: 'Workshop restored successfully', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({ status: 'ERROR', message: error.message || 'Failed to restore workshop' });
    }
  }

  static async listRooms(_req, res) {
    try {
      const result = await AdminService.listRooms();
      return res.status(200).json({ status: 'SUCCESS', message: 'Rooms retrieved successfully', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({ status: 'ERROR', message: error.message || 'Failed to fetch rooms' });
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
