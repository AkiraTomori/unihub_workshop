import db from '../config/db.js';
import { randomUUID } from 'crypto';

export class Refund {
  /**
   * Find all SUCCESS payments for a workshop (eligible for refund)
   */
  static async findSuccessfulPaymentsByWorkshop(workshopId, trx = db) {
    return trx('payments as p')
      .join('registrations as r', 'p.registration_id', 'r.id')
      .join('workshops as w', 'r.workshop_id', 'w.id')
      .join('users as u', 'r.user_id', 'u.id')
      .where('r.workshop_id', workshopId)
      .where('p.status', 'SUCCESS')
      .select(
        'p.id as payment_id',
        'p.registration_id',
        'p.amount',
        'p.provider',
        'p.transaction_id',
        'r.user_id',
        'r.id as reg_id',
        'u.email as user_email',
        'u.full_name as user_full_name',
        'w.title as workshop_title'
      );
  }

  /**
   * Find single payment by ID with related registration/user info
   */
  static async findPaymentWithDetails(paymentId, trx = db) {
    return trx('payments as p')
      .join('registrations as r', 'p.registration_id', 'r.id')
      .join('workshops as w', 'r.workshop_id', 'w.id')
      .join('users as u', 'r.user_id', 'u.id')
      .where('p.id', paymentId)
      .select(
        'p.id as payment_id',
        'p.amount',
        'p.provider',
        'p.status as payment_status',
        'r.id as registration_id',
        'r.user_id',
        'u.email as user_email',
        'u.full_name as user_full_name',
        'w.title as workshop_title',
        'w.price',
        'w.start_time'
      )
      .first();
  }

  /**
   * Update payment to REFUNDED status with reason and timestamp
   */
  static async updatePaymentToRefunded(trx, paymentId, refundReason) {
    await trx('payments')
      .where({ id: paymentId })
      .update({
        status: 'REFUNDED',
        refund_reason: refundReason,
        refund_processed_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      });
  }

  /**
   * Cancel registration associated with refunded payment
   */
  static async cancelRegistration(trx, registrationId) {
    await trx('registrations')
      .where({ id: registrationId })
      .update({
        status: 'CANCELLED',
        updated_at: trx.fn.now(),
      });
  }

  /**
   * Decrement workshop registered count
   */
  static async decrementWorkshopRegisteredCount(trx, workshopId) {
    await trx('workshops')
      .where({ id: workshopId })
      .decrement('registered_count', 1);
  }

  /**
   * Enqueue refund notification event to outbox
   */
  static async enqueueRefundNotification(trx, { userId, recipient, workshopTitle, amount, reason }) {
    const subject = `Payment refund: ${workshopTitle}`;
    const content = [
      `Hello,`,
      '',
      `Your payment for "${workshopTitle}" has been refunded.`,
      `Amount: ${(amount / 1000).toLocaleString('vi-VN')}k VND`,
      `Reason: ${reason}`,
      '',
      'If you have any questions, please contact our support team.',
    ].join('\n');
    const notificationId = randomUUID();

    await trx('outbox_events').insert({
      id: randomUUID(),
      aggregate_id: userId,
      event_type: 'NotificationRequested',
      payload: {
        notification_id: notificationId,
        user_id: userId,
        channel: 'EMAIL',
        template: 'refund-confirmed',
        subject,
        recipient,
        content,
        reference_type: 'REFUND',
        reference_id: null,
      },
      status: 'PENDING',
      created_at: trx.fn.now(),
      updated_at: trx.fn.now(),
    });

    // Insert into notifications table so worker can update status later
    await trx('notifications').insert({
      id: notificationId,
      user_id: userId,
      channel: 'EMAIL',
      template: 'refund-confirmed',
      subject,
      content,
      recipient,
      status: 'PENDING',
      created_at: trx.fn.now(),
      updated_at: trx.fn.now(),
    });
  }

  /**
   * List refund history for a user
   */
  static async listByUser(userId, trx = db) {
    return trx('payments as p')
      .join('registrations as r', 'p.registration_id', 'r.id')
      .join('workshops as w', 'r.workshop_id', 'w.id')
      .where('p.status', 'REFUNDED')
      .where('r.user_id', userId)
      .select(
        'p.id as payment_id',
        'p.amount',
        'p.refund_reason',
        'p.refund_processed_at',
        'w.title as workshop_title',
        'w.start_time'
      )
      .orderBy('p.refund_processed_at', 'desc');
  }

  /**
   * Get single refund details (student view)
   */
  static async getRefundById(paymentId, trx = db) {
    return trx('payments')
      .where({ id: paymentId, status: 'REFUNDED' })
      .select(
        'id as payment_id',
        'amount',
        'refund_reason',
        'refund_processed_at',
        'status'
      )
      .first();
  }

  /**
   * List all refunds (admin view) with pagination and filtering
   */
  static async listAllRefunds(query = {}, trx = db) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.max(1, Number(query.pageSize) || 20);
    const offset = (page - 1) * pageSize;

    let q = trx('payments as p')
      .join('registrations as r', 'p.registration_id', 'r.id')
      .join('workshops as w', 'r.workshop_id', 'w.id')
      .join('users as u', 'r.user_id', 'u.id')
      .where('p.status', 'REFUNDED')
      .select(
        'p.id as payment_id',
        'p.amount',
        'p.refund_reason',
        'p.refund_processed_at',
        'r.id as registration_id',
        'w.id as workshop_id',
        'w.title as workshop_title',
        'w.start_time',
        'u.id as user_id',
        'u.email as user_email',
        'u.full_name as user_full_name'
      );

    // Apply filters
    if (query.workshop_id) {
      q = q.where('w.id', query.workshop_id);
    }
    if (query.reason) {
      q = q.where('p.refund_reason', 'ilike', `%${query.reason}%`);
    }

    const [total, refunds] = await Promise.all([
      trx('payments')
        .where('status', 'REFUNDED')
        .count('* as count')
        .first(),
      q.orderBy('p.refund_processed_at', 'desc')
        .offset(offset)
        .limit(pageSize)
    ]);

    return {
      data: refunds,
      pagination: {
        page,
        pageSize,
        total: total?.count || 0,
        totalPages: Math.max(1, Math.ceil((total?.count || 0) / pageSize)),
        hasPrevPage: page > 1,
        hasNextPage: page * pageSize < (total?.count || 0)
      }
    };
  }

  /**
   * Get refund statistics (admin view)
   */
  static async getRefundStats(trx = db) {
    const result = await trx('payments')
      .where('status', 'REFUNDED')
      .select(
        trx.raw('COUNT(*) as total_count'),
        trx.raw('SUM(amount) as total_amount'),
        trx.raw("COUNT(DISTINCT refund_reason) as unique_reasons")
      )
      .first();

    // Group by reason
    const byReason = await trx('payments')
      .where('status', 'REFUNDED')
      .select('refund_reason')
      .count('* as count')
      .sum('amount as total_amount')
      .groupBy('refund_reason');

    return {
      total_count: Number(result?.total_count || 0),
      total_amount: Number(result?.total_amount || 0),
      by_reason: byReason.map(r => ({
        reason: r.refund_reason,
        count: Number(r.count),
        amount: Number(r.total_amount)
      }))
    };
  }
}

export default Refund;
