import db from '../config/db.js';

export class Notification {
  static async listByUser(userId) {
    return db('notifications')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(50)
      .select('id', 'channel', 'subject', 'content', 'status', 'created_at');
  }
}

export default Notification;