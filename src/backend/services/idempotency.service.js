import { getRedisClient } from '../config/redis.js';
import { config } from '../config/config.js';

const PREFIX = 'payment:idempotency:';
const IN_FLIGHT_TTL_SECONDS = 60;

function buildKey(idempotencyKey) {
  return `${PREFIX}${idempotencyKey}`;
}

export function isTerminalPaymentResult(result) {
  return result?.status === 'CONFIRMED';
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
      EX: IN_FLIGHT_TTL_SECONDS,
    });

    if (acquired) {
      return { acquired: true, cached: null };
    }

    const cached = await this.get(idempotencyKey);
    return { acquired: false, cached };
  }

  static async saveSuccess(idempotencyKey, result) {
    if (!isTerminalPaymentResult(result)) {
      return;
    }

    const redis = await getRedisClient();
    await redis.set(buildKey(idempotencyKey), JSON.stringify(result), {
      EX: config.payment.idempotencyTtlSeconds,
    });
  }

  static async release(idempotencyKey) {
    const redis = await getRedisClient();
    await redis.del(buildKey(idempotencyKey));
  }
}

export default IdempotencyService;
