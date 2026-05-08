import { config } from '../config/config.js';
import { closeRabbitMQ, consumeQueue, createQueue } from '../config/rabbitmq.js';
import Notification from '../models/notification.model.js';
import MailerService from '../services/mailer.service.js';
import db from '../config/db.js';

const QUEUE_NAME = 'notification.worker.queue';
const ROUTING_KEY = 'notification.requested';

function buildEmailBody(notification) {
  const text = notification.content || '';
  const html = notification.content || '';

  return { text, html };
}

async function handleNotificationRequestedEvent(message) {
  const payload = message?.payload || message;
  const notificationId = payload?.notification_id;
  const recipient = payload?.recipient;
  const subject = payload?.subject || 'UniHub notification';
  const content = payload?.content || '';
  const channel = payload?.channel || 'EMAIL';

  if (!notificationId) {
    throw new Error('notification_id is required');
  }

  if (channel !== 'EMAIL') {
    await Notification.updateStatus(notificationId, 'SENT');
    console.log(`[Notification Worker] Skipped non-email notification ${notificationId}`);
    return;
  }

  if (!recipient) {
    await Notification.updateStatus(notificationId, 'FAILED');
    throw new Error(`Recipient missing for notification ${notificationId}`);
  }

  try {
    const body = buildEmailBody({ content });
    await MailerService.sendEmail({
      to: recipient,
      subject,
      text: body.text,
      html: body.html,
    });

    await Notification.updateStatus(notificationId, 'SENT');
    console.log(`[Notification Worker] Email sent for notification ${notificationId}`);
  } catch (error) {
    await Notification.updateStatus(notificationId, 'FAILED');
    console.error(`[Notification Worker] Email send failed for ${notificationId}:`, error.message);
  }
}

async function startWorker() {
  console.log('[Notification Worker] Starting...');
  console.log(`[Notification Worker] SMTP host: ${config.smtp.host || '(not configured)'}`);

  await createQueue(QUEUE_NAME, ROUTING_KEY);
  await consumeQueue(QUEUE_NAME, handleNotificationRequestedEvent);

  process.on('SIGINT', async () => {
    console.log('[Notification Worker] Shutting down gracefully...');
    await db.destroy();
    await closeRabbitMQ();
    process.exit(0);
  });
}

startWorker().catch(async (error) => {
  console.error('[Notification Worker] Failed to start:', error.message);
  await closeRabbitMQ();
  await db.destroy();
  process.exit(1);
});
