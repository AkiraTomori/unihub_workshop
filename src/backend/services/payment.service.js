import { randomUUID } from 'crypto';
import db from '../config/db.js';
import Payment from '../models/payment.model.js';
import Registration from '../models/registration.model.js';
import CircuitBreakerService from './circuit-breaker.service.js';
import IdempotencyService from './idempotency.service.js';
import PaymentGatewayService from './payment-gateway.service.js';

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

function buildCheckoutResponse({ status, qrCode, message, paymentId, circuitState, idempotencyState }) {
  return {
    status,
    ...(qrCode ? { qrCode } : {}),
    message,
    ...(paymentId ? { payment_id: paymentId } : {}),
    ...(circuitState ? { circuit_state: circuitState } : {}),
    ...(idempotencyState ? { idempotency_state: idempotencyState } : {}),
  };
}

async function confirmPaidRegistration(trx, registration, paymentId) {
  if (registration.registration_status === 'CONFIRMED') {
    return;
  }

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

  return paymentId;
}

export class PaymentService {
  static async checkout({ userId, registrationId, idempotencyKey, simulateResult = 'success' }) {
    const cached = await IdempotencyService.get(idempotencyKey);
    if (cached && cached.status !== 'PROCESSING') {
      return buildCheckoutResponse({ ...cached, idempotencyState: 'REPLAYED' });
    }

    const reservation = await IdempotencyService.reserve(idempotencyKey);
    if (!reservation.acquired) {
      if (reservation.cached && reservation.cached.status !== 'PROCESSING') {
        return buildCheckoutResponse({ ...reservation.cached, idempotencyState: 'REPLAYED' });
      }
      return buildCheckoutResponse({
        status: 'PENDING_PAYMENT',
        message: 'Payment is already being processed. Please wait and retry shortly.',
        idempotencyState: 'IN_PROGRESS',
      });
    }

    const circuit = await CircuitBreakerService.canRequest();
    if (!circuit.allowed) {
      const pendingResult = buildCheckoutResponse({
        status: 'PENDING_PAYMENT',
        message: 'Payment gateway is temporarily unavailable. Your seat remains reserved. Please try again later.',
        circuitState: circuit.state,
        idempotencyState: 'CIRCUIT_OPEN',
      });
      await IdempotencyService.save(idempotencyKey, pendingResult);
      return pendingResult;
    }

    const registration = await Payment.findRegistrationForCheckout(userId, registrationId);
    if (!registration) {
      throw { status: 404, message: 'Registration not found' };
    }

    const existingByKey = await Payment.findByIdempotencyKey(idempotencyKey);
    if (existingByKey?.status === 'SUCCESS') {
      const replay = buildCheckoutResponse({
        status: 'CONFIRMED',
        qrCode: registration.qr_code,
        message: 'Payment already confirmed',
        paymentId: existingByKey.id,
        idempotencyState: 'REPLAYED',
      });
      await IdempotencyService.save(idempotencyKey, replay);
      return replay;
    }

    if (circuit.state === 'HALF_OPEN') {
      await CircuitBreakerService.recordProbeAttempt();
    }

    let gatewayResult;
    try {
      gatewayResult = await PaymentGatewayService.charge({
        amount: registration.price,
        simulateResult,
      });
      await CircuitBreakerService.recordRequestOutcome(true);
    } catch (error) {
      await CircuitBreakerService.recordRequestOutcome(false);

      const pendingPayment = await db.transaction(async (trx) => {
        let payment = await Payment.findByRegistrationId(registration.id, trx);
        if (!payment) {
          payment = await Payment.createPayment(trx, {
            id: randomUUID(),
            registration_id: registration.id,
            amount: registration.price,
            provider: 'VNPAY',
            transaction_id: null,
            idempotency_key: idempotencyKey,
            status: 'PENDING',
          });
        } else {
          await Payment.updatePaymentStatus(trx, payment.id, {
            idempotency_key: idempotencyKey,
            status: 'PENDING',
          });
        }
        return payment;
      });

      const pendingResult = buildCheckoutResponse({
        status: 'PENDING_PAYMENT',
        message: error.message || 'Payment gateway timeout. Please retry with the same idempotency key.',
        paymentId: pendingPayment.id,
        circuitState: await CircuitBreakerService.getState(),
        idempotencyState: 'PENDING',
      });
      await IdempotencyService.save(idempotencyKey, pendingResult);
      return pendingResult;
    }

    const result = await db.transaction(async (trx) => {
      const lockedRegistration = await Payment.findRegistrationForCheckout(userId, registrationId, trx);
      if (!lockedRegistration) {
        throw { status: 404, message: 'Registration not found' };
      }

      const duplicateKey = await Payment.findByIdempotencyKey(idempotencyKey, trx);
      if (duplicateKey?.status === 'SUCCESS') {
        return buildCheckoutResponse({
          status: 'CONFIRMED',
          qrCode: lockedRegistration.qr_code,
          message: 'Payment already confirmed',
          paymentId: duplicateKey.id,
          idempotencyState: 'REPLAYED',
        });
      }

      let payment = await Payment.findByRegistrationId(lockedRegistration.id, trx);
      if (!payment) {
        payment = await Payment.createPayment(trx, {
          id: randomUUID(),
          registration_id: lockedRegistration.id,
          amount: lockedRegistration.price,
          provider: 'VNPAY',
          transaction_id: gatewayResult.transactionId,
          idempotency_key: idempotencyKey,
          status: 'SUCCESS',
        });
      } else {
        await Payment.updatePaymentStatus(trx, payment.id, {
          idempotency_key: idempotencyKey,
          status: 'SUCCESS',
          transaction_id: gatewayResult.transactionId,
        });
      }

      await confirmPaidRegistration(trx, lockedRegistration, payment.id);

      return buildCheckoutResponse({
        status: 'CONFIRMED',
        qrCode: lockedRegistration.qr_code,
        message: 'Payment successful. Registration confirmed.',
        paymentId: payment.id,
        idempotencyState: 'COMPLETED',
      });
    });

    await IdempotencyService.save(idempotencyKey, result);
    return result;
  }

  static async handleWebhook({ registrationId, idempotencyKey, transactionId, status, userId }) {
    if (!registrationId || !idempotencyKey || !transactionId) {
      throw { status: 400, message: 'registrationId, idempotencyKey, and transactionId are required' };
    }

    if (status !== 'SUCCESS') {
      return { accepted: true, processed: false, message: 'Non-success webhook ignored' };
    }

    const cached = await IdempotencyService.get(idempotencyKey);
    if (cached?.status === 'CONFIRMED') {
      return { accepted: true, processed: true, payment_id: cached.payment_id, idempotency_state: 'REPLAYED' };
    }

    const registration = userId
      ? await Payment.findRegistrationForCheckout(userId, registrationId)
      : await db('registrations as r')
          .join('workshops as w', 'r.workshop_id', 'w.id')
          .leftJoin('rooms as rm', 'w.room_id', 'rm.id')
          .join('users as u', 'r.user_id', 'u.id')
          .where('r.id', registrationId)
          .select(
            'r.id',
            'r.user_id',
            'r.workshop_id',
            'r.status as registration_status',
            'r.qr_code',
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

    if (!registration) {
      throw { status: 404, message: 'Registration not found' };
    }

    const result = await db.transaction(async (trx) => {
      const duplicateKey = await Payment.findByIdempotencyKey(idempotencyKey, trx);
      if (duplicateKey?.status === 'SUCCESS') {
        return {
          accepted: true,
          processed: true,
          payment_id: duplicateKey.id,
          idempotency_state: 'REPLAYED',
        };
      }

      let payment = await Payment.findByRegistrationId(registration.id, trx);
      if (!payment) {
        payment = await Payment.createPayment(trx, {
          id: randomUUID(),
          registration_id: registration.id,
          amount: registration.price,
          provider: 'VNPAY',
          transaction_id: transactionId,
          idempotency_key: idempotencyKey,
          status: 'SUCCESS',
        });
      } else {
        await Payment.updatePaymentStatus(trx, payment.id, {
          idempotency_key: idempotencyKey,
          status: 'SUCCESS',
          transaction_id: transactionId,
        });
      }

      await confirmPaidRegistration(trx, registration, payment.id);

      const checkoutResult = buildCheckoutResponse({
        status: 'CONFIRMED',
        qrCode: registration.qr_code,
        message: 'Payment confirmed via webhook',
        paymentId: payment.id,
        idempotencyState: 'WEBHOOK',
      });
      await IdempotencyService.save(idempotencyKey, checkoutResult);

      return {
        accepted: true,
        processed: true,
        payment_id: payment.id,
        idempotency_state: 'WEBHOOK',
      };
    });

    return result;
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
