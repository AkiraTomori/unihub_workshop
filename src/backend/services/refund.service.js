import db from '../config/db.js';
import Refund from '../models/refund.model.js';
import Payment from '../models/payment.model.js';

export class RefundService {
  /**
   * Refund a single payment
   * @param {string} paymentId - Payment UUID
   * @param {string} reason - Refund reason
   * @returns {object} Refund details
   */
  static async refundPayment(paymentId, reason) {
    return db.transaction(async (trx) => {
      const payment = await Refund.findPaymentWithDetails(paymentId, trx);
      
      if (!payment) {
        throw { status: 404, message: 'Payment not found' };
      }

      if (payment.payment_status !== 'SUCCESS') {
        throw {
          status: 400,
          message: `Cannot refund payment with status: ${payment.payment_status}`,
        };
      }

      // Get workshop_id from registration
      const registration = await trx('registrations')
        .where({ id: payment.registration_id })
        .select('workshop_id')
        .first();

      // Update payment to REFUNDED
      await Refund.updatePaymentToRefunded(trx, paymentId, reason);

      // Cancel associated registration
      await Refund.cancelRegistration(trx, payment.registration_id);

      // Decrement workshop count
      if (registration && registration.workshop_id) {
        await Refund.decrementWorkshopRegisteredCount(trx, registration.workshop_id);
      }

      // Enqueue refund notification
      await Refund.enqueueRefundNotification(trx, {
        userId: payment.user_id,
        recipient: payment.user_email,
        workshopTitle: payment.workshop_title,
        amount: payment.amount,
        reason,
      });

      return {
        payment_id: paymentId,
        amount: payment.amount,
        workshop: payment.workshop_title,
        reason,
        refunded_at: new Date().toISOString(),
      };
    });
  }

  /**
   * Refund all SUCCESS payments for a workshop (e.g., when workshop is cancelled)
   * @param {string} workshopId - Workshop UUID
   * @param {string} reason - Refund reason
   * @returns {object} Refund summary
   */
  static async refundWorkshopPayments(workshopId, reason) {
    return db.transaction(async (trx) => {
      const payments = await Refund.findSuccessfulPaymentsByWorkshop(workshopId, trx);

      const refunded = [];
      let totalAmount = 0;

      for (const payment of payments) {
        await Refund.updatePaymentToRefunded(trx, payment.payment_id, reason);
        await Refund.cancelRegistration(trx, payment.registration_id);
        await Refund.decrementWorkshopRegisteredCount(trx, workshopId);

        await Refund.enqueueRefundNotification(trx, {
          userId: payment.user_id,
          recipient: payment.user_email,
          workshopTitle: payment.workshop_title,
          amount: payment.amount,
          reason,
        });

        refunded.push(payment.payment_id);
        totalAmount += Number(payment.amount);
      }

      return {
        workshop_id: workshopId,
        refunded_count: refunded.length,
        total_amount: totalAmount,
        reason,
        processed_at: new Date().toISOString(),
      };
    });
  }

  /**
   * Refund payment within an existing transaction (used by admin.cancelWorkshop)
   * @param {object} trx - Knex transaction
   * @param {string} workshopId - Workshop UUID
   * @param {string} reason - Refund reason
   */
  static async refundWorkshopPaymentsWithinTrx(trx, workshopId, reason) {
    const payments = await Refund.findSuccessfulPaymentsByWorkshop(workshopId, trx);

    const refunded = [];
    let totalAmount = 0;

    for (const payment of payments) {
      await Refund.updatePaymentToRefunded(trx, payment.payment_id, reason);
      await Refund.cancelRegistration(trx, payment.registration_id);
      await Refund.decrementWorkshopRegisteredCount(trx, workshopId);

      await Refund.enqueueRefundNotification(trx, {
        userId: payment.user_id,
        recipient: payment.user_email,
        workshopTitle: payment.workshop_title,
        amount: payment.amount,
        reason,
      });

      refunded.push(payment.payment_id);
      totalAmount += Number(payment.amount);
    }

    return {
      refunded_count: refunded.length,
      total_amount: totalAmount,
      reason,
    };
  }

  /**
   * Get refund history for a user
   * @param {string} userId - User UUID
   */
  static async listUserRefunds(userId) {
    return Refund.listByUser(userId);
  }

  /**
   * Get refund details
   * @param {string} paymentId - Payment UUID
   */
  static async getRefundStatus(paymentId) {
    const payment = await Refund.getRefundById(paymentId);

    if (!payment) {
      throw { status: 404, message: 'Refund not found' };
    }

    return payment;
  }

  /**
   * Admin: List all refunds (paginated)
   * @param {object} query - { page, pageSize, reason, workshop_id }
   */
  static async listAllRefunds(query = {}) {
    return Refund.listAllRefunds(query);
  }

  /**
   * Admin: Get refund statistics
   */
  static async getRefundStats() {
    return Refund.getRefundStats();
  }
}

export default RefundService;
