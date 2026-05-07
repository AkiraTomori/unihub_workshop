import { randomUUID } from 'crypto';
import Payment from '../models/payment.model.js';
import Registration from '../models/registration.model.js';

export class PaymentService {
  static async checkout({ userId, registrationId, idempotencyKey, simulateResult = 'success' }) {
    return db.transaction(async (trx) => {
      const registration = await Payment.findRegistrationForCheckout(userId, registrationId, trx);

      if (!registration) {
        throw { status: 404, message: 'Registration not found' };
      }

      const existingByKey = await Payment.findByIdempotencyKey(idempotencyKey, trx);
      if (existingByKey) {
        if (existingByKey.status === 'SUCCESS') {
          return { status: 'CONFIRMED', qrCode: registration.qr_code, message: 'Payment already confirmed' };
        }
        return { status: 'PENDING_PAYMENT', message: 'Payment is pending. Please retry.' };
      }

      let payment = await Payment.findByRegistrationId(registration.id, trx);
      if (!payment) {
        payment = await Payment.createPayment(trx, {
          id: randomUUID(),
          registration_id: registration.id,
          amount: registration.price,
          provider: 'VNPAY',
          transaction_id: null,
          idempotency_key: idempotencyKey,
          status: simulateResult === 'success' ? 'SUCCESS' : 'PENDING',
        });
      } else {
        await Payment.updatePaymentStatus(trx, payment.id, {
          idempotency_key: idempotencyKey,
          status: simulateResult === 'success' ? 'SUCCESS' : 'PENDING',
          transaction_id: simulateResult === 'success' ? `VNPAY-${Date.now()}` : payment.transaction_id,
        });
      }

      if (simulateResult !== 'success') {
        return {
          status: 'PENDING_PAYMENT',
          message: 'Payment gateway timeout. Please retry with a new idempotency key.',
        };
      }

      if (registration.registration_status !== 'CONFIRMED') {
        await Payment.confirmRegistration(trx, registration.id);
        await Payment.incrementWorkshopRegisteredCount(trx, registration.workshop_id);
        await Registration.enqueueRegistrationSideEffects(
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
