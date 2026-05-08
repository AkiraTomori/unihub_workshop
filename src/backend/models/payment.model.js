import db from '../config/db.js';

export class Payment {
  static async findRegistrationForCheckout(userId, registrationId, trx = db) {
    return trx('registrations as r')
      .join('workshops as w', 'r.workshop_id', 'w.id')
      .where('r.id', registrationId)
      .where('r.user_id', userId)
      .select(
        'r.id',
        'r.user_id',
        'r.workshop_id',
        'r.status as registration_status',
        'r.qr_code',
        'w.title as workshop_title',
        'w.price',
        'w.registered_count'
      )
      .first();
  }

  static async findByIdempotencyKey(idempotencyKey, trx = db) {
    return trx('payments').where({ idempotency_key: idempotencyKey }).first();
  }

  static async findByRegistrationId(registrationId, trx = db) {
    return trx('payments').where({ registration_id: registrationId }).first();
  }

  static async findById(paymentId, trx = db) {
    return trx('payments')
      .where({ id: paymentId })
      .select('id', 'registration_id', 'amount', 'provider', 'status', 'transaction_id', 'idempotency_key')
      .first();
  }

  static async createPayment(trx, paymentData) {
    const [created] = await trx('payments')
      .insert(paymentData)
      .returning(['id', 'status']);

    return created;
  }

  static async updatePaymentStatus(trx, paymentId, payload) {
    await trx('payments')
      .where({ id: paymentId })
      .update({
        ...payload,
        updated_at: trx.fn.now(),
      });
  }

  static async confirmRegistration(trx, registrationId) {
    await trx('registrations')
      .where({ id: registrationId })
      .update({
        status: 'CONFIRMED',
        expires_at: null,
        updated_at: trx.fn.now(),
      });
  }

  static async incrementWorkshopRegisteredCount(trx, workshopId) {
    await trx('workshops').where({ id: workshopId }).increment('registered_count', 1);
  }
}

export default Payment;