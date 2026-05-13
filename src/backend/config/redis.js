import { createClient } from 'redis';
import { config } from './config.js';

let client = null;
let connecting = null;

function createRedisClient() {
  return createClient({ url: config.redis.url });
}

export async function getRedisClient() {
  if (client?.isOpen) {
    return client;
  }

  if (!connecting) {
    connecting = (async () => {
      const redisClient = createRedisClient();

      redisClient.on('error', (error) => {
        console.error('[Redis] Client error:', error.message);
        if (/NOAUTH|WRONGPASS/i.test(error.message)) {
          client = null;
        }
      });

      await redisClient.connect();
      client = redisClient;
      return client;
    })();
  }

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

export async function closeRedis() {
  if (client?.isOpen) {
    await client.quit();
  }
  client = null;
}

export default { getRedisClient, closeRedis };
