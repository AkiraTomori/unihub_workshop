import { randomUUID } from 'crypto';
import db from '../config/db.js';

export class CheckinService {
  static async sync(items = []) {
    const results = [];

    for (const item of items) {
      if (!item?.offlineSyncId) continue;

      const existing = await db('checkins').where({ offline_sync_id: item.offlineSyncId }).first();
      if (existing) {
        results.push({ offlineSyncId: item.offlineSyncId, status: 'DUPLICATE' });
        continue;
      }

      if (!item.registrationId) {
        results.push({ offlineSyncId: item.offlineSyncId, status: 'SKIPPED' });
        continue;
      }

      await db('checkins').insert({
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
