import { getRedisClient } from '../config/redis.js';
import { config } from '../config/config.js';

const PREFIX = 'payment:idempotency:';

function buildKey(idempotencyKey) {
  return `${PREFIX}${idempotencyKey}`;
}

export class IdempotencyService {
  static async get(idempotencyKey) {
    const redis = await getRedisClient();
    const raw = await redis.get(buildKey(idempotencyKey));
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static async reserve(idempotencyKey) {
    const redis = await getRedisClient();
    const key = buildKey(idempotencyKey);
    const placeholder = JSON.stringify({ status: 'PROCESSING' });

    const acquired = await redis.set(key, placeholder, {
      NX: true,
      EX: config.payment.idempotencyTtlSeconds,
    });

    if (acquired) {
      return { acquired: true, cached: null };
    }

    const cached = await this.get(idempotencyKey);
    return { acquired: false, cached };
  }

  static async save(idempotencyKey, result) {
    const redis = await getRedisClient();
    await redis.set(buildKey(idempotencyKey), JSON.stringify(result), {
      EX: config.payment.idempotencyTtlSeconds,
    });
  }
}

export default IdempotencyService;
