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
      const result = await AdminService.createWorkshop(req.user.id, req.body);
      return res.status(201).json({ status: 'SUCCESS', message: 'Workshop created successfully', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({ status: 'ERROR', message: error.message || 'Failed to create workshop' });
    }
  }

  static async updateWorkshop(req, res) {
    try {
      const result = await AdminService.updateWorkshop(req.user.id, req.params.id, req.body);
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

  static async createRoom(req, res) {
    try {
      // Validation already applied by validateRoom middleware
      const payload = req.validatedData || req.body;
      const result = await AdminService.createRoom(req.user.id, payload);
      return res.status(201).json({ status: 'SUCCESS', message: 'Room created successfully', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({ status: 'ERROR', message: error.message || 'Failed to create room' });
    }
  }

  static async updateRoom(req, res) {
    try {
      const payload = req.body;
      const roomId = req.params.id;
      const result = await AdminService.updateRoom(req.user.id, roomId, payload);
      return res.status(200).json({ status: 'SUCCESS', message: 'Room updated successfully', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({ status: 'ERROR', message: error.message || 'Failed to update room' });
    }
  }

  static async deleteRoom(req, res) {
    try {
      const roomId = req.params.id;
      const result = await AdminService.deleteRoom(req.user.id, roomId);
      return res.status(200).json({ status: 'SUCCESS', message: 'Room deleted successfully', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({ status: 'ERROR', message: error.message || 'Failed to delete room' });
    }
  }

  static async restoreRoom(req, res) {
    try {
      const roomId = req.params.id;
      const result = await AdminService.restoreRoom(req.user.id, roomId);
      return res.status(200).json({ status: 'SUCCESS', message: 'Room restored successfully', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({ status: 'ERROR', message: error.message || 'Failed to restore room' });
    }
  }

  static async listDeletedRooms(req, res) {
    try {
      const result = await AdminService.listDeletedRooms();
      return res.status(200).json({ status: 'SUCCESS', message: 'Deleted rooms retrieved successfully', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({ status: 'ERROR', message: error.message || 'Failed to fetch deleted rooms' });
    }
  }

  static async getRoomWorkshops(req, res) {
    try {
      const { roomId } = req.params;
      const result = await AdminService.getRoomWorkshops(roomId);
      return res.status(200).json({ status: 'SUCCESS', message: 'Room workshops retrieved successfully', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({ status: 'ERROR', message: error.message || 'Failed to fetch room workshops' });
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

      const result = await AdminService.uploadDocument(req.user.id, workshopId, file.buffer, file.originalname);
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

      const result = await AdminService.startDocumentSummary(req.user.id, workshopId);
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
      const result = await AdminService.triggerCsvSync(req.user.id);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to trigger CSV sync',
      });
    }
  }

  static async uploadCsvSyncFile(req, res) {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({ status: 'VALIDATION_ERROR', message: 'CSV file is required' });
      }

      const result = await AdminService.uploadCsvSyncFile(req.user.id, file.buffer, file.originalname);
      return res.status(200).json({
        status: 'SUCCESS',
        message: 'CSV file uploaded successfully',
        data: result,
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to upload CSV file',
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

  static async getAuditLogs(req, res) {
    try {
      const page = req.query.page ? parseInt(req.query.page, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
      const entityType = req.query.entityType || null;
      const action = req.query.action || null;
      const result = await AdminService.getAuditLogs({ page, limit, entityType, action });
      return res.status(200).json({ status: 'SUCCESS', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to fetch audit logs',
      });
    }
  }

  static async listStudents(req, res) {
    try {
      const result = await AdminService.listStudents(req.query || {});
      return res.status(200).json({ status: 'SUCCESS', message: 'Students retrieved successfully', data: result });
    } catch (error) {
      return res.status(error.status || 500).json({ status: 'ERROR', message: error.message || 'Failed to fetch students' });
    }
  }
}

export default AdminController;
