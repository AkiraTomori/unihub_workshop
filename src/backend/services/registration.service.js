import { randomUUID } from 'crypto';
import Registration from '../models/registration.model.js';

function generateQrCode() {
  return `UNI-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

export class RegistrationService {
  static async createRegistration(userId, workshopId) {
    return db.transaction(async (trx) => {
      const workshop = await Registration.findWorkshopById(workshopId, trx);

      if (!workshop || workshop.status !== 'PUBLISHED') {
        throw { status: 404, message: 'Workshop not found or unavailable' };
      }

      const activeRegistration = await Registration.findActiveRegistration(userId, workshopId, trx);

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

      await Registration.createRegistration(trx, {
        id: registrationId,
        user_id: userId,
        workshop_id: workshopId,
        status,
        expires_at: expiresAt,
        qr_code: qrCode,
      });

      if (!isPaidWorkshop) {
        await Registration.incrementWorkshopRegisteredCount(workshopId, trx);
        await Registration.enqueueRegistrationSideEffects(trx, userId, registrationId, workshop.title);
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
    return Registration.listMyRegistrations(userId);
  }
}

export default RegistrationService;
