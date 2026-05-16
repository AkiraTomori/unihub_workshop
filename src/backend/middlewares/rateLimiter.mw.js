import { TokenBucket } from '../utils/tokenBucket.js';

export const registrationRateLimiter = async (req, res, next) => {
  // 1. Global Rate Limit
  // Capacity: 100 requests. Refill Rate: 50 requests per second.
  // This allows short bursts up to 100 requests, and sustains 50 req/sec (~3000 req/min).
  const globalLimit = await TokenBucket.consume('global_registration', 100, 50);

  if (!globalLimit.allowed) {
    return res.status(429).json({
      status: 'TOO_MANY_REQUESTS',
      message: 'System is currently experiencing high traffic. Please try again in a few seconds.',
      code: 'GLOBAL_RATE_LIMIT_EXCEEDED'
    });
  }

  // 2. Per-User Rate Limit
  // Capacity: 2 requests. Refill Rate: 1 request per second.
  // This ensures fairness by allowing a small burst (e.g. accidental double click) 
  // but strict sustained rate limit.
  const userId = req.user?.id || req.ip; // Fallback to IP if user not authenticated
  const userLimit = await TokenBucket.consume(`user_registration:${userId}`, 2, 1);

  if (!userLimit.allowed) {
    return res.status(429).json({
      status: 'TOO_MANY_REQUESTS',
      message: 'You are sending requests too quickly. Please wait and try again.',
      code: 'USER_RATE_LIMIT_EXCEEDED'
    });
  }

  // Attach remaining token count to headers for observability
  res.setHeader('X-RateLimit-Global-Remaining', Math.floor(globalLimit.remaining));
  res.setHeader('X-RateLimit-User-Remaining', Math.floor(userLimit.remaining));

  next();
};

export default { registrationRateLimiter };
