import amqp from 'amqplib';
import { config } from './config.js';

const RABBITMQ_URL = config.rabbitmq.url;
const EXCHANGE_NAME = 'workshop_events';
const QUEUE_PREFIX = 'queue_';

let connection = null;
let channel = null;

/**
 * Initialize RabbitMQ connection
 */
export async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Assert exchange exists
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

    console.log('[RabbitMQ] Connected successfully');
    return channel;
  } catch (error) {
    console.error('[RabbitMQ] Connection failed:', error.message);
    throw error;
  }
}

/**
 * Get channel, connect if not already connected
 */
export async function getChannel() {
  if (!channel) {
    await connectRabbitMQ();
  }
  return channel;
}

/**
 * Publish event to RabbitMQ
 * @param {string} routingKey - Event routing key (e.g., "document.uploaded")
 * @param {object} payload - Event payload
 */
export async function publishEvent(routingKey, payload) {
  try {
    const ch = await getChannel();
    const message = Buffer.from(JSON.stringify(payload));

    await ch.publish(EXCHANGE_NAME, routingKey, message, {
      persistent: true,
      contentType: 'application/json',
    });

    console.log(`[RabbitMQ] Published event: ${routingKey}`);
    return true;
  } catch (error) {
    console.error('[RabbitMQ] Publish failed:', error.message);
    throw error;
  }
}

/**
 * Create queue and bind to exchange
 * @param {string} queueName - Queue name
 * @param {string} routingKey - Routing key pattern
 */
export async function createQueue(queueName, routingKey) {
  try {
    const ch = await getChannel();
    const fullQueueName = `${QUEUE_PREFIX}${queueName}`;

    await ch.assertQueue(fullQueueName, { durable: true });
    await ch.bindQueue(fullQueueName, EXCHANGE_NAME, routingKey);

    console.log(`[RabbitMQ] Queue created: ${fullQueueName}`);
    return fullQueueName;
  } catch (error) {
    console.error('[RabbitMQ] Queue creation failed:', error.message);
    throw error;
  }
}

/**
 * Consume messages from queue
 * @param {string} queueName - Queue name
 * @param {Function} handler - Async message handler
 */
export async function consumeQueue(queueName, handler) {
  try {
    const ch = await getChannel();
    const fullQueueName = `${QUEUE_PREFIX}${queueName}`;

    await ch.prefetch(1); // Process one message at a time

    await ch.consume(fullQueueName, async (msg) => {
      if (msg === null) {
        return;
      }

      try {
        const content = JSON.parse(msg.content.toString());
        console.log(`[RabbitMQ] Received message from ${fullQueueName}:`, content);

        await handler(content);
        ch.ack(msg);
      } catch (error) {
        console.error('[RabbitMQ] Handler error:', error.message);
        // Requeue on error
        ch.nack(msg, false, true);
      }
    });

    console.log(`[RabbitMQ] Started consuming from: ${fullQueueName}`);
  } catch (error) {
    console.error('[RabbitMQ] Consume failed:', error.message);
    throw error;
  }
}

/**
 * Gracefully close connection
 */
export async function closeRabbitMQ() {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    console.log('[RabbitMQ] Connection closed');
  } catch (error) {
    console.error('[RabbitMQ] Close failed:', error.message);
  }
}

export default {
  connectRabbitMQ,
  getChannel,
  publishEvent,
  createQueue,
  consumeQueue,
  closeRabbitMQ,
};
