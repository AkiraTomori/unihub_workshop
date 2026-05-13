import { getRedisClient } from '../config/redis.js';
import { config } from '../config/config.js';

const PREFIX = 'circuit:payment';
const STATE_KEY = `${PREFIX}:state`;
const OPENED_AT_KEY = `${PREFIX}:opened_at`;
const EVENTS_KEY = `${PREFIX}:events`;
const PROBES_KEY = `${PREFIX}:half_open_probes`;

const { failureThreshold, windowMs, openDurationMs, halfOpenMaxProbes } = config.circuitBreaker;

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

  static async canRequest() {
    const redis = await getClient();
    const state = (await redis.get(STATE_KEY)) || 'CLOSED';

    if (state === 'CLOSED') {
      return { allowed: true, state: 'CLOSED' };
    }

    if (state === 'OPEN') {
      const openedAt = Number(await redis.get(OPENED_AT_KEY) || 0);
      if (now() - openedAt < openDurationMs) {
        return { allowed: false, state: 'OPEN' };
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
    await redis.set(STATE_KEY, 'CLOSED');
    await redis.del(OPENED_AT_KEY);
    await redis.del(PROBES_KEY);
    await redis.del(EVENTS_KEY);
  }

  static async recordRequestOutcome(success) {
    const redis = await getClient();
    const timestamp = now();
    const label = success ? `success:${timestamp}` : `failure:${timestamp}`;

    await redis.zAdd(EVENTS_KEY, [{ score: timestamp, value: label }]);
    await redis.zRemRangeByScore(EVENTS_KEY, 0, timestamp - windowMs);

    const state = (await redis.get(STATE_KEY)) || 'CLOSED';

    if (success) {
      if (state === 'HALF_OPEN') {
        await this.recordSuccess();
      }
      return;
    }

    if (state === 'HALF_OPEN') {
      await redis.set(STATE_KEY, 'OPEN');
      await redis.set(OPENED_AT_KEY, String(timestamp));
      await redis.del(PROBES_KEY);
      return;
    }

    const events = await redis.zRangeByScore(EVENTS_KEY, timestamp - windowMs, timestamp);
    const failures = events.filter((entry) => entry.startsWith('failure:')).length;

    if (events.length >= 2 && failures / events.length > failureThreshold) {
      await redis.set(STATE_KEY, 'OPEN');
      await redis.set(OPENED_AT_KEY, String(timestamp));
    }
  }
}

export default CircuitBreakerService;
