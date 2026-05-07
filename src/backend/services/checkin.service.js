import { randomUUID } from 'crypto';
import Checkin from '../models/checkin.model.js';

export class CheckinService {
  static async scanByQr(qrCode, deviceId = 'mobile-checker') {
    if (!qrCode) {
      throw { status: 400, message: 'qrCode is required' };
    }

    const registration = await Checkin.findRegistrationByQr(qrCode);

    if (!registration) {
      throw { status: 404, message: 'Invalid QR code or registration not confirmed' };
    }

    const existing = await Checkin.findByRegistrationId(registration.id);

    if (existing) {
      return {
        alreadyCheckedIn: true,
        studentName: registration.student_name,
        workshopTitle: registration.workshop_title,
      };
    }

    await Checkin.createCheckin(db, {
      id: randomUUID(),
      registration_id: registration.id,
      device_id: deviceId,
      scanned_at: new Date(),
      offline_sync_id: null,
    });

    return {
      alreadyCheckedIn: false,
      studentName: registration.student_name,
      workshopTitle: registration.workshop_title,
    };
  }

  static async sync(items = []) {
    const results = [];

    for (const item of items) {
      if (!item?.offlineSyncId) continue;

      const existing = await Checkin.findByOfflineSyncId(item.offlineSyncId);
      if (existing) {
        results.push({ offlineSyncId: item.offlineSyncId, status: 'DUPLICATE' });
        continue;
      }

      if (!item.registrationId) {
        results.push({ offlineSyncId: item.offlineSyncId, status: 'SKIPPED' });
        continue;
      }

      await Checkin.createCheckin(db, {
        id: randomUUID(),
        registration_id: item.registrationId,
        device_id: 'web-checker',
        scanned_at: item.checkedInAt ? new Date(item.checkedInAt) : new Date(),
        offline_sync_id: item.offlineSyncId,
      });
      results.push({ offlineSyncId: item.offlineSyncId, status: 'SYNCED' });
    }

    return results;
  }
}

export default CheckinService;
