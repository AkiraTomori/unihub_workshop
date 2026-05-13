import { getRedisClient } from '../config/redis.js';
import { config } from '../config/config.js';

const PREFIX = 'circuit:payment';
const STATE_KEY = `${PREFIX}:state`;
const OPENED_AT_KEY = `${PREFIX}:opened_at`;
const PROBES_KEY = `${PREFIX}:half_open_probes`;

const { openDurationMs, halfOpenMaxProbes } = config.circuitBreaker;

async function getClient() {
  return getRedisClient();
}

function now() {
  return Date.now();
}

export class CircuitBreakerService {
  static async getState() {
    const redis = await getClient();
    const state = await redis.get(STATE_KEY);
    return state || 'CLOSED';
  }

  static async openCircuit() {
    const redis = await getClient();
    await redis.set(STATE_KEY, 'OPEN');
    await redis.set(OPENED_AT_KEY, String(now()));
    await redis.del(PROBES_KEY);
  }

  static async canRequest() {
    const redis = await getClient();
    const state = (await redis.get(STATE_KEY)) || 'CLOSED';

    if (state === 'CLOSED') {
      return { allowed: true, state: 'CLOSED' };
    }

    if (state === 'OPEN') {
      const openedAt = Number(await redis.get(OPENED_AT_KEY) || 0);
      if (now() - openedAt < openDurationMs) {
        return { allowed: false, state: 'OPEN', retryAfterMs: openDurationMs - (now() - openedAt) };
      }

      await redis.set(STATE_KEY, 'HALF_OPEN');
      await redis.set(PROBES_KEY, '0');
      return { allowed: true, state: 'HALF_OPEN' };
    }

    const probes = Number(await redis.get(PROBES_KEY) || 0);
    if (probes >= halfOpenMaxProbes) {
      return { allowed: false, state: 'HALF_OPEN' };
    }

    return { allowed: true, state: 'HALF_OPEN' };
  }

  static async recordProbeAttempt() {
    const redis = await getClient();
    await redis.incr(PROBES_KEY);
  }

  static async recordSuccess() {
    const redis = await getClient();
    const state = (await redis.get(STATE_KEY)) || 'CLOSED';

    if (state === 'HALF_OPEN') {
      await redis.set(STATE_KEY, 'CLOSED');
      await redis.del(OPENED_AT_KEY);
      await redis.del(PROBES_KEY);
    }
  }

  static async recordFailure() {
    const state = await this.getState();

    if (state === 'HALF_OPEN' || state === 'CLOSED') {
      await this.openCircuit();
    }
  }
}

export default CircuitBreakerService;
