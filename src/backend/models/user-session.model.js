import db from '../config/db.js';

export class UserSession {
  /**
   * Create new session
   */
  static async create(sessionData) {
    const [{id}] = await db('user_sessions').insert({
      user_id: sessionData.user_id,
      refresh_token: sessionData.refresh_token,
      ip_address: sessionData.ip_address || null,
      is_revoked: false,
      expires_at: sessionData.expires_at,
    }).returning('id');

    return this.findById(id);
  }

  /**
   * Find session by ID
   */
  static async findById(id) {
    return db('user_sessions').where('id', id).first();
  }

  /**
   * Find session by refresh token
   */
  static async findByToken(token) {
    return db('user_sessions')
      .where('refresh_token', token)
      .andWhere('is_revoked', false)
      .first();
  }

  /**
   * Find active sessions by user ID
   */
  static async findByUserId(userId) {
    const now = new Date();
    return db('user_sessions')
      .where('user_id', userId)
      .andWhere('is_revoked', false)
      .andWhere('expires_at', '>', now);
  }

  /**
   * Revoke session
   */
  static async revoke(id) {
    await db('user_sessions').where('id', id).update({ is_revoked: true });
    return this.findById(id);
  }

  /**
   * Revoke all sessions for user
   */
  static async revokeAllByUserId(userId) {
    return db('user_sessions')
      .where('user_id', userId)
      .update({ is_revoked: true });
  }

  /**
   * Check if session is valid
   */
  static async isValid(token) {
    const session = await this.findByToken(token);
    if (!session) return false;

    const now = new Date();
    return session.expires_at > now && !session.is_revoked;
  }

  /**
   * Cleanup expired sessions
   */
  static async cleanupExpired() {
    const now = new Date();
    return db('user_sessions')
      .where('expires_at', '<=', now)
      .del();
  }
}

export default UserSession;
