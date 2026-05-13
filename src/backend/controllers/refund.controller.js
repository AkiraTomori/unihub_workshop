import RefundService from '../services/refund.service.js';

export class RefundController {
  /**
   * Refund a single payment (student-facing endpoint)
   */
  static async refundPayment(req, res) {
    try {
      const userId = req.user.id;
      const { paymentId, reason } = req.body;

      if (!paymentId || !reason) {
        return res.status(400).json({
          status: 'VALIDATION_ERROR',
          message: 'paymentId and reason are required',
        });
      }

      const result = await RefundService.refundPayment(paymentId, reason);
      return res.status(200).json({ data: result });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Refund failed',
      });
    }
  }

  /**
   * List user refund history
   */
  static async listMyRefunds(req, res) {
    try {
      const userId = req.user.id;
      const result = await RefundService.listUserRefunds(userId);
      return res.status(200).json({ data: result });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to fetch refunds',
      });
    }
  }

  /**
   * Get refund status
   */
  static async getRefundStatus(req, res) {
    try {
      const { paymentId } = req.params;
      const result = await RefundService.getRefundStatus(paymentId);
      return res.status(200).json({ data: result });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Refund not found',
      });
    }
  }

  /**
   * Admin: List all refunds (paginated)
   */
  static async listAllRefunds(req, res) {
    try {
      const result = await RefundService.listAllRefunds(req.query);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to list refunds',
      });
    }
  }

  /**
   * Admin: Get refund statistics
   */
  static async getRefundStats(req, res) {
    try {
      const result = await RefundService.getRefundStats();
      return res.status(200).json({ data: result });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to get refund statistics',
      });
    }
  }
}

export default RefundController;
