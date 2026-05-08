import { closeRabbitMQ, publishEvent } from '../config/rabbitmq.js';
import Outbox from '../models/outbox.model.js';

const ROUTING_KEY_BY_EVENT_TYPE = {
  NotificationRequested: 'notification.requested',
};

async function processOutboxOnce() {
  const rows = await Outbox.listPending(20);

  for (const row of rows) {
    const routingKey = ROUTING_KEY_BY_EVENT_TYPE[row.event_type];
    if (!routingKey) {
      await Outbox.markFailed(row.id);
      continue;
    }

    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    await publishEvent(routingKey, payload);
    await Outbox.markPublished(row.id);
  }
}

async function startWorker() {
  console.log('[Outbox Worker] Starting...');
  await processOutboxOnce();
  setInterval(processOutboxOnce, 3000);

  process.on('SIGINT', async () => {
    await closeRabbitMQ();
    process.exit(0);
  });
}

startWorker().catch(async (error) => {
  console.error('[Outbox Worker] Failed to start:', error.message);
  await closeRabbitMQ();
  process.exit(1);
});