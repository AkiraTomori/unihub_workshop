import { getRedisClient } from '../config/redis.js';
import { randomUUID } from 'crypto';

// The Token Bucket Lua script handles the rate limiting algorithm atomically.
// It tracks tokens and timestamp to calculate refilled tokens before allowing request.
const TOKEN_BUCKET_SCRIPT = `
  local tokens_key = KEYS[1]
  local timestamp_key = KEYS[2]

  local rate = tonumber(ARGV[1])
  local capacity = tonumber(ARGV[2])
  local now = tonumber(ARGV[3])
  local requested = tonumber(ARGV[4])

  local fill_time = capacity / rate
  local ttl = math.floor(fill_time * 2)
  if ttl < 10 then
    ttl = 10
  end

  local last_tokens = tonumber(redis.call("GET", tokens_key))
  if last_tokens == nil then
    last_tokens = capacity
  end

  local last_refreshed = tonumber(redis.call("GET", timestamp_key))
  if last_refreshed == nil then
    last_refreshed = now
  end

  local delta_seconds = math.max(0, now - last_refreshed)
  local filled_tokens = math.min(capacity, last_tokens + (delta_seconds * rate))
  local allowed = filled_tokens >= requested
  local new_tokens = filled_tokens

  if allowed then
    new_tokens = filled_tokens - requested
  end

  redis.call("SET", tokens_key, new_tokens, "EX", ttl)
  redis.call("SET", timestamp_key, now, "EX", ttl)

  return { allowed and 1 or 0, new_tokens }
`;

export class TokenBucket {
  /**
   * Consumes tokens from the specified bucket
   * @param {string} identifier - The unique identifier for the bucket (e.g., global, user ID)
   * @param {number} capacity - Maximum number of tokens the bucket can hold
   * @param {number} rate - Token refill rate per second
   * @param {number} requested - Number of tokens to consume (default 1)
   * @returns {Promise<{ allowed: boolean, remaining: number }>}
   */
  static async consume(identifier, capacity, rate, requested = 1) {
    try {
      const redis = await getRedisClient();
      if (!redis) {
        // Fail-open if Redis is not available to avoid blocking all traffic when cache is down
        console.warn('[TokenBucket] Redis client not available, allowing request by default.');
        return { allowed: true, remaining: capacity };
      }

      const tokensKey = `tb:${identifier}:tokens`;
      const timestampKey = `tb:${identifier}:ts`;
      const now = Date.now() / 1000.0;

      // Ensure script is executed. We don't load script to cache because EVAL automatically handles it,
      // but EVALSHA could be used for further optimization in production.
      const result = await redis.eval(
        TOKEN_BUCKET_SCRIPT,
        {
          keys: [tokensKey, timestampKey],
          arguments: [rate.toString(), capacity.toString(), now.toString(), requested.toString()],
        }
      );

      return {
        allowed: result[0] === 1,
        remaining: result[1]
      };
    } catch (error) {
      console.error('[TokenBucket] Error evaluating token bucket script:', error.message);
      // Fail-open strategy to not completely break the API when Redis encounters an error
      return { allowed: true, remaining: 1 };
    }
  }
}

export default TokenBucket;
