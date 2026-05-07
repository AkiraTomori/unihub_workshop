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
      const { workshopId } = req.body;
      const file = req.file;

      if (!workshopId) {
        return res.status(400).json({ status: 'VALIDATION_ERROR', message: 'workshopId is required' });
      }

      if (!file) {
        return res.status(400).json({ status: 'VALIDATION_ERROR', message: 'File is required' });
      }

      const result = await AdminService.uploadDocument(workshopId, file.buffer, file.originalname);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to upload document',
      });
    }
  }

  static async getDocument(req, res) {
    try {
      const { workshopId } = req.params;

      if (!workshopId) {
        return res.status(400).json({ status: 'VALIDATION_ERROR', message: 'workshopId is required' });
      }

      const document = await AdminService.getDocument(workshopId);

      if (!document) {
        return res.status(404).json({ status: 'ERROR', message: 'Document not found' });
      }

      return res.status(200).json({ status: 'SUCCESS', data: document });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to fetch document',
      });
    }
  }

  static async startDocumentSummary(req, res) {
    try {
      const { workshopId } = req.params;

      if (!workshopId) {
        return res.status(400).json({ status: 'VALIDATION_ERROR', message: 'workshopId is required' });
      }

      const result = await AdminService.startDocumentSummary(workshopId);
      return res.status(200).json({ status: 'SUCCESS', message: 'Document summary started successfully', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to start document summary',
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

  static async getWorkshopRegistrations(req, res) {
    try {
      const result = await AdminService.getWorkshopRegistrations(req.params.workshopId);
      return res.status(200).json({ status: 'SUCCESS', message: 'Workshop registrations retrieved successfully', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({ status: 'ERROR', message: error.message || 'Failed to fetch workshop registrations' });
    }
  }

  static async getCheckinStats(req, res) {
    try {
      const result = await AdminService.getCheckinStats();
      return res.status(200).json({ status: 'SUCCESS', message: 'Check-in statistics retrieved successfully', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({ status: 'ERROR', message: error.message || 'Failed to fetch check-in statistics' });
    }
  }

  static async triggerCsvSync(req, res) {
    try {
      const result = await AdminService.triggerCsvSync();
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to trigger CSV sync',
      });
    }
  }

  static async getCsvSyncLogs(req, res) {
    try {
      const page = req.query.page ? parseInt(req.query.page) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit) : 20;
      const result = await AdminService.getCsvSyncLogs(page, limit);
      return res.status(200).json({ status: 'SUCCESS', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to fetch CSV sync logs',
      });
    }
  }
}

export default AdminController;
