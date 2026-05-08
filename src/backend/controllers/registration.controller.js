import RegistrationService from '../services/registration.service.js';

export class RegistrationController {
  static async create(req, res) {
    try {
      const userId = req.user.id;
      const { workshopId } = req.body;
      if (!workshopId) {
        return res.status(400).json({ status: 'VALIDATION_ERROR', message: 'workshopId is required' });
      }

      const result = await RegistrationService.createRegistration(userId, workshopId);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to register workshop',
      });
    }
  }

  static async listMine(req, res) {
    try {
      const rows = await RegistrationService.listMyRegistrations(req.user.id);
      return res.status(200).json(rows);
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to fetch registrations',
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const result = await RegistrationService.getRegistrationById(id);
      return res.status(200).json({ data: result });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to fetch registration detail',
      });
    }
  }
}

export default RegistrationController;
