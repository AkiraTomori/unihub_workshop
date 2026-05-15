import { randomUUID } from 'crypto';
import db from '../config/db.js';
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
      const offlineSyncId = item?.offlineSyncId || item?.offline_sync_id;
      const qrCode = item?.qrCode || item?.qr_code;
      const registrationId = item?.registrationId || item?.registration_id || null;
      const deviceId = item?.deviceId || item?.device_id || 'web-checker';
      const checkedInAt = item?.checkedInAt || item?.scanned_at || null;

      if (!offlineSyncId) continue;

      const existing = await Checkin.findByOfflineSyncId(offlineSyncId);
      if (existing) {
        results.push({ offlineSyncId, status: 'DUPLICATE' });
        continue;
      }

      let registration = null;
      if (registrationId) {
        registration = { id: registrationId };
      } else if (qrCode) {
        registration = await Checkin.findRegistrationByQr(qrCode);
      }

      if (!registration) {
        results.push({ offlineSyncId, status: 'SKIPPED' });
        continue;
      }

      const existingRegistrationCheckin = await Checkin.findByRegistrationId(registration.id);

      if (existingRegistrationCheckin) {
        await Checkin.updateByRegistrationId(registration.id, {
          device_id: deviceId,
          scanned_at: checkedInAt ? new Date(checkedInAt) : new Date(),
          offline_sync_id: offlineSyncId,
        });
        results.push({ offlineSyncId, status: 'UPDATED' });
        continue;
      }

      await Checkin.createCheckin(db, {
        id: randomUUID(),
        registration_id: registration.id,
        device_id: deviceId,
        scanned_at: checkedInAt ? new Date(checkedInAt) : new Date(),
        offline_sync_id: offlineSyncId,
      });
      results.push({ offlineSyncId, status: 'SYNCED' });
    }

    return results;
  }

  static async listMyCheckins(userId) {
    return Checkin.listByUser(userId);
  }
}

export default CheckinService;
