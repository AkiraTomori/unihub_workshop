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
}

export default Checkin;