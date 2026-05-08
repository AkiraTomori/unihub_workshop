import { randomUUID } from 'crypto';
import db from '../config/db.js';
import Payment from '../models/payment.model.js';
import Registration from '../models/registration.model.js';

function buildRegistrationEmail({ fullName, workshopTitle, workshopStartTime, registrationId, workshopSpeaker, workshopRoomName, qrCode }) {
  const startText = workshopStartTime ? new Date(workshopStartTime).toLocaleString() : 'N/A';

  return [
    `Hello ${fullName || 'student'},`,
    '',
    `Your payment for "${workshopTitle}" was successful and your registration is confirmed.`,
    `Workshop speaker: ${workshopSpeaker || 'TBA'}`,
    `Workshop room: ${workshopRoomName || 'TBA'}`,
    `Registration ID: ${registrationId}`,
    `Workshop starts at: ${startText}`,
    `QR Code: ${qrCode}`,
    '',
    'Please keep this email for check-in and verification.',
  ].join('\n');
}

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
        const subject = `Registration confirmed: ${registration.workshop_title}`;
        const content = buildRegistrationEmail({
          fullName: registration.user_full_name,
          workshopTitle: registration.workshop_title,
          workshopStartTime: registration.workshop_start_time,
          registrationId: registration.id,
          workshopSpeaker: registration.workshop_speaker,
          workshopRoomName: registration.room_name,
          qrCode: registration.qr_code,
        });

        await Registration.enqueueRegistrationSideEffects(trx, {
          userId: registration.user_id,
          recipient: registration.user_email,
          subject,
          content,
          registrationId: registration.id,
          workshopId: registration.workshop_id,
          workshopTitle: registration.workshop_title,
          workshopStartTime: registration.workshop_start_time,
          workshopSpeaker: registration.workshop_speaker,
          workshopRoomName: registration.room_name,
          qrCode: registration.qr_code,
        });
      }

      return {
        status: 'CONFIRMED',
        qrCode: registration.qr_code,
        message: 'Payment successful. Registration confirmed.',
      };
    });
  }

  static async getPaymentById(paymentId) {
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      throw { status: 404, message: 'Payment not found' };
    }

    return {
      payment_id: payment.id,
      registration_id: payment.registration_id,
      amount: Number(payment.amount),
      provider: payment.provider,
      status: payment.status,
      transaction_id: payment.transaction_id,
      idempotency_key: payment.idempotency_key,
    };
  }

  static async listMyPayments(userId) {
    return Payment.listByUser(userId);
  }
}

export default PaymentService;
