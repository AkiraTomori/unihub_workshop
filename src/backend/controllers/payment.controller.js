import PaymentService from '../services/payment.service.js';

export class PaymentController {
  static async checkout(req, res) {
    try {
      const userId = req.user.id;
      const { registrationId, idempotencyKey, simulateResult } = req.body;
      if (!registrationId || !idempotencyKey) {
        return res.status(400).json({
          status: 'VALIDATION_ERROR',
          message: 'registrationId and idempotencyKey are required',
        });
      }

      const result = await PaymentService.checkout({
        userId,
        registrationId,
        idempotencyKey,
        simulateResult,
      });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Payment failed',
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const result = await PaymentService.getPaymentById(id);
      return res.status(200).json({ data: result });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to fetch payment detail',
      });
    }
  }

  static async listMine(req, res) {
    try {
      const result = await PaymentService.listMyPayments(req.user.id);
      return res.status(200).json({ data: result });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Failed to fetch payments',
      });
    }
  }
}

export default PaymentController;
