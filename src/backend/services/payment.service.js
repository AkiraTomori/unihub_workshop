import { randomUUID } from 'crypto';
import db from '../config/db.js';
import RegistrationService from './registration.service.js';

export class PaymentService {
  static async checkout({ userId, registrationId, idempotencyKey, simulateResult = 'success' }) {
    return db.transaction(async (trx) => {
      const registration = await trx('registrations as r')
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

      if (!registration) {
        throw { status: 404, message: 'Registration not found' };
      }

      const existingByKey = await trx('payments').where({ idempotency_key: idempotencyKey }).first();
      if (existingByKey) {
        if (existingByKey.status === 'SUCCESS') {
          return { status: 'CONFIRMED', qrCode: registration.qr_code, message: 'Payment already confirmed' };
        }
        return { status: 'PENDING_PAYMENT', message: 'Payment is pending. Please retry.' };
      }

      let payment = await trx('payments').where({ registration_id: registration.id }).first();
      if (!payment) {
        const [created] = await trx('payments')
          .insert({
            id: randomUUID(),
            registration_id: registration.id,
            amount: registration.price,
            provider: 'VNPAY',
            transaction_id: null,
            idempotency_key: idempotencyKey,
            status: simulateResult === 'success' ? 'SUCCESS' : 'PENDING',
          })
          .returning(['id', 'status']);
        payment = created;
      } else {
        await trx('payments')
          .where({ id: payment.id })
          .update({
            idempotency_key: idempotencyKey,
            status: simulateResult === 'success' ? 'SUCCESS' : 'PENDING',
            transaction_id: simulateResult === 'success' ? `VNPAY-${Date.now()}` : payment.transaction_id,
            updated_at: trx.fn.now(),
          });
      }

      if (simulateResult !== 'success') {
        return {
          status: 'PENDING_PAYMENT',
          message: 'Payment gateway timeout. Please retry with a new idempotency key.',
        };
      }

      if (registration.registration_status !== 'CONFIRMED') {
        await trx('registrations')
          .where({ id: registration.id })
          .update({
            status: 'CONFIRMED',
            expires_at: null,
            updated_at: trx.fn.now(),
          });
        await trx('workshops').where({ id: registration.workshop_id }).increment('registered_count', 1);
        await RegistrationService._enqueueRegistrationSideEffects(
          trx,
          registration.user_id,
          registration.id,
          registration.workshop_title
        );
      }

      return {
        status: 'CONFIRMED',
        qrCode: registration.qr_code,
        message: 'Payment successful. Registration confirmed.',
      };
    });
  }
}

export default PaymentService;
