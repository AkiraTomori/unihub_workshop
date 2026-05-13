import { config } from '../config/config.js';
import PaymentService from '../services/payment.service.js';

export class PaymentController {
  static async checkout(req, res) {
    try {
      const userId = req.user.id;
      const registrationId = req.body.registrationId || req.body.registration_id;
      const idempotencyKey = req.body.idempotencyKey || req.body.idempotency_key;
      const { simulateResult } = req.body;

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

  static async webhook(req, res) {
    try {
      const secret = req.headers['x-webhook-secret'];
      if (!config.payment.webhookSecret || secret !== config.payment.webhookSecret) {
        return res.status(401).json({
          status: 'ERROR',
          message: 'Invalid webhook secret',
        });
      }

      const registrationId = req.body.registrationId || req.body.registration_id;
      const idempotencyKey = req.body.idempotencyKey || req.body.idempotency_key;
      const transactionId = req.body.transactionId || req.body.transaction_id;
      const { status } = req.body;

      const result = await PaymentService.handleWebhook({
        registrationId,
        idempotencyKey,
        transactionId,
        status,
      });

      return res.status(200).json({ data: result });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: 'ERROR',
        message: error.message || 'Webhook processing failed',
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
