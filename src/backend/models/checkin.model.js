import db from '../config/db.js';

export class Checkin {
  static async findRegistrationByQr(qrCode, trx = db) {
    return trx('registrations as r')
      .join('users as u', 'r.user_id', 'u.id')
      .join('workshops as w', 'r.workshop_id', 'w.id')
      .where('r.qr_code', qrCode)
      .where('r.status', 'CONFIRMED')
      .select('r.id', 'u.full_name as student_name', 'w.title as workshop_title')
      .first();
  }

  static async findByRegistrationId(registrationId, trx = db) {
    return trx('checkins').where({ registration_id: registrationId }).first();
  }

  static async findByOfflineSyncId(offlineSyncId, trx = db) {
    return trx('checkins').where({ offline_sync_id: offlineSyncId }).first();
  }

  static async createCheckin(trx, checkinData) {
    await trx('checkins').insert(checkinData);
  }

  static async getCheckinStats(workshopId = null) {
    let query = db('checkins as c')
      .join('registrations as r', 'c.registration_id', 'r.id');

    if (workshopId) {
      query = query.where('r.workshop_id', workshopId);
    }

    const totalCheckins = await query.clone().count('c.id as count').first();
    const uniqueRegistrations = await db('checkins')
      .countDistinct('registration_id as count')
      .first();
    const duplicateScans = await db('checkins')
      .whereNotNull('offline_sync_id')
      .count('id as count')
      .first();

    return {
      totalCheckins: Number(totalCheckins?.count || 0),
      uniqueRegistrations: Number(uniqueRegistrations?.count || 0),
      duplicateScans: Number(duplicateScans?.count || 0),
    };
  }
}

export default Checkin;