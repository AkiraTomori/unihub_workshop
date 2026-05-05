import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { AUTH_ERRORS, HTTP_STATUS } from '../utils/constants.js';

/**
 * Verify JWT token from Authorization header
 * Expected format: Authorization: Bearer <token>
 */
export function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(AUTH_ERRORS.NO_TOKEN);
    }

    // Extract token from Bearer scheme
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(AUTH_ERRORS.INVALID_TOKEN_FORMAT);
    }

    const token = parts[1];

    // Verify token signature and expiry
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    req.user = decoded;
    next();
  } catch (error) {
    let errorResponse = AUTH_ERRORS.INVALID_TOKEN;

    if (error.name === 'TokenExpiredError') {
      errorResponse = AUTH_ERRORS.TOKEN_EXPIRED;
    } else if (error.name === 'JsonWebTokenError') {
      errorResponse = AUTH_ERRORS.INVALID_TOKEN;
    }

    return res.status(HTTP_STATUS.UNAUTHORIZED).json(errorResponse);
  }
}

/**
 * Require specific roles
 * Usage: requireRole(['ADMIN', 'STAFF'])
 */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    // Check if user is authenticated (verifyToken middleware should be called first)
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(AUTH_ERRORS.NOT_AUTHENTICATED);
    }

    // Check if user role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        ...AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
        message: `${AUTH_ERRORS.INSUFFICIENT_PERMISSIONS.message} ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}

/**
 * Optional authentication - doesn't fail if token is missing, but validates if present
 */
export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      req.user = null;
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      const decoded = jwt.verify(token, config.jwt.accessSecret);
      req.user = decoded;
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    req.user = null;
    next();
  }
}

/**
 * Rate limiting middleware (basic implementation)
 */
export function rateLimit(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const attempts = new Map();

  return (req, res, next) => {
    const key = `${req.ip}-${req.path}`;
    const now = Date.now();

    if (!attempts.has(key)) {
      attempts.set(key, []);
    }

    const userAttempts = attempts.get(key).filter((time) => time > now - windowMs);
    userAttempts.push(now);

    if (userAttempts.length > maxAttempts) {
      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json(AUTH_ERRORS.RATE_LIMIT_EXCEEDED);
    }

    attempts.set(key, userAttempts);
    return next();
  };
}

export default {
  verifyToken,
  requireRole,
  optionalAuth,
  rateLimit,
};
