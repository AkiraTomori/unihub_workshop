/**
 * Authentication error codes and messages
 */
export const AUTH_ERRORS = {
  NO_TOKEN: {
    status: 'UNAUTHORIZED',
    message: 'Missing authorization token',
    code: 'NO_TOKEN',
  },
  INVALID_TOKEN_FORMAT: {
    status: 'UNAUTHORIZED',
    message: 'Invalid authorization header format. Use: Bearer <token>',
    code: 'INVALID_TOKEN_FORMAT',
  },
  TOKEN_EXPIRED: {
    status: 'UNAUTHORIZED',
    message: 'Token has expired',
    code: 'TOKEN_EXPIRED',
  },
  INVALID_TOKEN: {
    status: 'UNAUTHORIZED',
    message: 'Invalid or expired token',
    code: 'INVALID_TOKEN',
  },
  NOT_AUTHENTICATED: {
    status: 'UNAUTHORIZED',
    message: 'User not authenticated',
    code: 'NOT_AUTHENTICATED',
  },
  INSUFFICIENT_PERMISSIONS: {
    status: 'FORBIDDEN',
    message: 'Access denied. Required roles:',
    code: 'INSUFFICIENT_PERMISSIONS',
  },
  RATE_LIMIT_EXCEEDED: {
    status: 'TOO_MANY_REQUESTS',
    message: 'Too many attempts. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
};

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  TOO_MANY_REQUESTS: 429,
};

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT = {
  LOGIN: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  REGISTER: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 60 minutes
  },
  REFRESH: {
    maxAttempts: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
};

export default {
  AUTH_ERRORS,
  HTTP_STATUS,
  RATE_LIMIT,
};
