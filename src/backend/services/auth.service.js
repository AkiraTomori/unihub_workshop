import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import User from '../models/user.model.js';
import UserSession from '../models/user-session.model.js';

/**
 * Hash password with bcrypt
 */
async function hashPassword(password) {
  return bcrypt.hash(password, config.bcrypt.rounds);
}

/**
 * Compare plain password with hash
 */
async function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

/**
 * Generate JWT tokens
 */
function generateTokens(userId, userRole) {
  const accessToken = jwt.sign(
    {
      id: userId,
      role: userRole,
      type: 'access',
    },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiry }
  );

  const refreshToken = jwt.sign(
    {
      id: userId,
      role: userRole,
      type: 'refresh',
    },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry }
  );

  return { accessToken, refreshToken };
}

/**
 * Calculate token expiry date
 */
function calculateExpiryDate(expiryString) {
  const expiryMs = parseExpiry(expiryString);
  return new Date(Date.now() + expiryMs);
}

/**
 * Parse expiry string (e.g., "1h", "30d") to milliseconds
 */
function parseExpiry(expiryString) {
  const match = expiryString.match(/^(\d+)([hdm])$/);
  if (!match) throw new Error('Invalid expiry format');

  const [, value, unit] = match;
  const multipliers = {
    h: 3600000, // hours to ms
    d: 86400000, // days to ms
    m: 60000, // minutes to ms
  };

  return parseInt(value) * multipliers[unit];
}

export class AuthService {
  /**
   * Login user and create session
   */
  static async login(email, password, ipAddress) {
    // Find user by email
    const user = await User.findByEmail(email);

    if (!user) {
      throw {
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      };
    }

    // Check if user is active
    if (!user.is_active) {
      throw {
        status: 403,
        code: 'ACCOUNT_INACTIVE',
        message: 'Account is inactive',
      };
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw {
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      };
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.role);

    // Create session in database
    const expiryDate = calculateExpiryDate(config.jwt.refreshExpiry);
    await UserSession.create({
      user_id: user.id,
      refresh_token: refreshToken,
      ip_address: ipAddress,
      expires_at: expiryDate,
    });

    // Return tokens and user info
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        student_code: user.student_code,
      },
    };
  }

  /**
   * Register new user
   */
  static async register(userData) {
    // Check if email exists
    const existingEmail = await User.findByEmail(userData.email);
    if (existingEmail) {
      throw {
        status: 400,
        code: 'EMAIL_EXISTS',
        message: 'Email already exists',
      };
    }

    // Hash password
    const passwordHash = await hashPassword(userData.password);

    // Create user
    const user = await User.create({
      email: userData.email,
      password_hash: passwordHash,
      full_name: userData.full_name,
      student_code: userData.student_code || null,
      role: 'STUDENT',
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    };
  }

  /**
   * Refresh access token
   */
  static async refresh(refreshToken) {
    if (!refreshToken) {
      throw {
        status: 401,
        code: 'NO_REFRESH_TOKEN',
        message: 'Refresh token not provided',
      };
    }

    // Verify refresh token signature
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch (error) {
      throw {
        status: 401,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      };
    }

    // Check session in database
    const session = await UserSession.findByToken(refreshToken);
    if (!session || session.is_revoked) {
      throw {
        status: 401,
        code: 'SESSION_REVOKED',
        message: 'Session has been revoked. Please login again.',
      };
    }

    // Check if user is still active
    const user = await User.findById(decoded.id);
    if (!user || !user.is_active) {
      throw {
        status: 403,
        code: 'ACCOUNT_INACTIVE',
        message: 'Account is inactive',
      };
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        type: 'access',
      },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiry }
    );

    return { accessToken: newAccessToken };
  }

  /**
   * Logout and revoke session
   */
  static async logout(userId, refreshToken) {
    if (refreshToken) {
      const session = await UserSession.findByToken(refreshToken);
      if (session) {
        await UserSession.revoke(session.id);
      }
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * Get user profile
   */
  static async getProfile(userId) {
    const user = await User.getProfile(userId);

    if (!user) {
      throw {
        status: 404,
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      };
    }

    return user;
  }

  /**
   * Change password
   */
  // static async changePassword(userId, oldPassword, newPassword) {
  //   const user = await User.findById(userId);

  //   if (!user) {
  //     throw {
  //       status: 404,
  //       code: 'USER_NOT_FOUND',
  //       message: 'User not found',
  //     };
  //   }

  //   // Verify old password
  //   const isOldPasswordValid = await comparePassword(oldPassword, user.password_hash);
  //   if (!isOldPasswordValid) {
  //     throw {
  //       status: 400,
  //       code: 'INVALID_OLD_PASSWORD',
  //       message: 'Old password is incorrect',
  //     };
  //   }

  //   // Hash new password
  //   const newPasswordHash = await hashPassword(newPassword);

  //   // Update password
  //   await User.update(userId, { password_hash: newPasswordHash });

  //   // Revoke all sessions (force re-login)
  //   await UserSession.revokeAllByUserId(userId);

  //   return { message: 'Password changed successfully' };
  // }

  // /**
  //  * Verify password
  //  */
  // static async verifyPassword(password, hash) {
  //   return comparePassword(password, hash);
  // }
}

export default AuthService;
