import { randomUUID } from 'crypto';
import db from '../config/db.js';

function generateQrCode() {
  return `UNI-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

export class RegistrationService {
  static async createRegistration(userId, workshopId) {
    return db.transaction(async (trx) => {
      const workshop = await trx('workshops')
        .where({ id: workshopId })
        .whereNull('deleted_at')
        .first();

      if (!workshop || workshop.status !== 'PUBLISHED') {
        throw { status: 404, message: 'Workshop not found or unavailable' };
      }

      const activeRegistration = await trx('registrations')
        .where({ user_id: userId, workshop_id: workshopId })
        .whereNot('status', 'CANCELLED')
        .first();

      if (activeRegistration) {
        return {
          id: activeRegistration.id,
          qr_code: activeRegistration.qr_code,
          requires_payment: activeRegistration.status !== 'CONFIRMED' && Number(workshop.price) > 0,
          status: activeRegistration.status,
        };
      }

      const seatsLeft = Number(workshop.capacity || 0) - Number(workshop.registered_count || 0);
      if (seatsLeft <= 0) {
        throw { status: 400, message: 'Workshop is sold out' };
      }

      const isPaidWorkshop = Number(workshop.price) > 0;
      const registrationId = randomUUID();
      const qrCode = generateQrCode();
      const expiresAt = isPaidWorkshop ? trx.raw(`NOW() + INTERVAL '15 minutes'`) : null;
      const status = isPaidWorkshop ? 'PENDING_PAYMENT' : 'CONFIRMED';

      await trx('registrations').insert({
        id: registrationId,
        user_id: userId,
        workshop_id: workshopId,
        status,
        expires_at: expiresAt,
        qr_code: qrCode,
      });

      if (!isPaidWorkshop) {
        await trx('workshops').where({ id: workshopId }).increment('registered_count', 1);
        await this._enqueueRegistrationSideEffects(trx, userId, registrationId, workshop.title);
      }

      return {
        id: registrationId,
        qr_code: qrCode,
        requires_payment: isPaidWorkshop,
        status,
      };
    });
  }

  static async listMyRegistrations(userId) {
    return db('registrations as r')
      .join('workshops as w', 'r.workshop_id', 'w.id')
      .where('r.user_id', userId)
      .whereNot('r.status', 'CANCELLED')
      .select(
        'r.id',
        'r.workshop_id',
        'r.status',
        'r.qr_code',
        'w.title as workshop_title',
        'w.start_time as workshop_date'
      )
      .orderBy('r.created_at', 'desc');
  }

  static async _enqueueRegistrationSideEffects(trx, userId, registrationId, workshopTitle) {
    await trx('outbox_events').insert({
      id: randomUUID(),
      aggregate_id: registrationId,
      event_type: 'registration.confirmed',
      payload: JSON.stringify({ registrationId }),
      status: 'PENDING',
    });

    await trx('notifications').insert({
      id: randomUUID(),
      user_id: userId,
      channel: 'IN_APP',
      template: 'registration_confirm',
      subject: 'Registration Confirmed',
      content: `Your registration is confirmed for ${workshopTitle}.`,
      recipient: '',
      status: 'PENDING',
    });
  }
}

export default RegistrationService;
