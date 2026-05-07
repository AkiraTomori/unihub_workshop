import WorkshopService from '../services/workshop.service.js';

export class WorkshopController {
  static async list(req, res) {
    try {
      const result = await WorkshopService.listPublished(req.query);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to fetch workshops',
      });
    }
  }

  static async detail(req, res) {
    try {
      const result = await WorkshopService.getPublishedDetail(req.params.workshopId);
      return res.status(200).json({ data: result });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to fetch workshop detail',
      });
    }
  }
}

export default WorkshopController;
