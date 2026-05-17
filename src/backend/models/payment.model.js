import db from '../config/db.js';

export class Payment {
  static async findRegistrationForCheckout(userId, registrationId, trx = db) {
    return trx('registrations as r')
      .join('workshops as w', 'r.workshop_id', 'w.id')
      .leftJoin('rooms as rm', 'w.room_id', 'rm.id')
      .join('users as u', 'r.user_id', 'u.id')
      .where('r.id', registrationId)
      .where('r.user_id', userId)
      .select(
        'r.id',
        'r.user_id',
        'r.workshop_id',
        'r.status as registration_status',
        trx.raw("CASE WHEN r.status = 'CONFIRMED' THEN r.qr_code ELSE NULL END as qr_code"),
        'w.title as workshop_title',
        'w.start_time as workshop_start_time',
        'w.speaker as workshop_speaker',
        'rm.name as room_name',
        'w.price',
        'w.registered_count',
        'u.email as user_email',
        'u.full_name as user_full_name'
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

  static async listByUser(userId, trx = db) {
    return trx('payments as p')
      .join('registrations as r', 'p.registration_id', 'r.id')
      .join('workshops as w', 'r.workshop_id', 'w.id')
      .where('r.user_id', userId)
      .select(
        'p.id as payment_id',
        'p.registration_id',
        'p.amount',
        'p.provider',
        'p.transaction_id',
        'p.idempotency_key',
        'p.status',
        'p.created_at',
        'p.updated_at',
        'r.workshop_id',
        'r.status as registration_status',
        trx.raw("CASE WHEN r.status = 'CONFIRMED' THEN r.qr_code ELSE NULL END as qr_code"),
        'w.title as workshop_title',
        'w.start_time as workshop_start_time',
        'w.room_id'
      )
      .orderBy('p.created_at', 'desc');
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

  static async confirmRegistration(trx, registrationId, qrCode) {
    await trx('registrations')
      .where({ id: registrationId })
      .update({
        status: 'CONFIRMED',
        expires_at: null,
        ...(qrCode ? { qr_code: qrCode } : {}),
        updated_at: trx.fn.now(),
      });
  }

  static async incrementWorkshopRegisteredCount(trx, workshopId) {
    await trx('workshops').where({ id: workshopId }).increment('registered_count', 1);
  }
}

export default Payment;
