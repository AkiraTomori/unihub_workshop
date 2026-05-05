import db from '../config/db.js';

export class User {
  /**
   * Find user by email (for login)
   */
  static async findByEmail(email) {
    return db('users').where('email', email).first();
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    return db('users').where('id', id).first();
  }

  /**
   * Create new user
   */
  static async create(userData) {
    const [{id}] = await db('users').insert({
      email: userData.email,
      student_code: userData.student_code || null,
      password_hash: userData.password_hash,
      full_name: userData.full_name,
      role: userData.role || 'STUDENT',
      is_active: true,
    }).returning('id');

    return this.findById(id);
  }

  /**
   * Update user
   */
  static async update(id, userData) {
    await db('users').where('id', id).update({
      ...userData,
      updated_at: db.fn.now(),
    });

    return this.findById(id);
  }

  /**
   * Check if user is active
   */
  static async isActive(id) {
    const user = await db('users').where('id', id).select('is_active').first();
    return user ? user.is_active : false;
  }

  /**
   * Deactivate user
   */
  static async deactivate(id) {
    return this.update(id, { is_active: false });
  }

  /**
   * Activate user
   */
  static async activate(id) {
    return this.update(id, { is_active: true });
  }

  /**
   * Get user profile (safe fields)
   */
  static async getProfile(id) {
    return db('users')
      .where('id', id)
      .select('id', 'email', 'full_name', 'role', 'student_code', 'is_active', 'created_at')
      .first();
  }
}

export default User;
