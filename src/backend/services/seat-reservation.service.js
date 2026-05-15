import { getRedisClient } from '../config/redis.js';

const KEY_PREFIX = 'workshop:seats:';

function buildSeatKey(workshopId) {
  return `${KEY_PREFIX}${workshopId}`;
}

function normalizeInteger(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

export class SeatReservationService {
  static async reserveSeat({ workshopId, capacity, registeredCount, pendingCount }) {
    const redis = await getRedisClient();
    const key = buildSeatKey(workshopId);

    const normalizedCapacity = normalizeInteger(capacity);
    const normalizedRegistered = normalizeInteger(registeredCount);
    const normalizedPending = normalizeInteger(pendingCount);

    const initialRemaining = Math.max(0, normalizedCapacity - normalizedRegistered - normalizedPending);

    await redis.set(key, String(initialRemaining), { NX: true });

    const remainingAfterReserve = await redis.decr(key);
    if (remainingAfterReserve < 0) {
      await redis.incr(key);
      return {
        reserved: false,
        remaining: 0,
      };
    }

    return {
      reserved: true,
      remaining: remainingAfterReserve,
    };
  }

  static async releaseSeat(workshopId) {
    const redis = await getRedisClient();
    const key = buildSeatKey(workshopId);
    await redis.incr(key);
  }

  static async getRemainingSeats(workshopId) {
    const redis = await getRedisClient();
    const raw = await redis.get(buildSeatKey(workshopId));
    return raw === null ? null : normalizeInteger(raw, null);
  }
}

export default SeatReservationService;