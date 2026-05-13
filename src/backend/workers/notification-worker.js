import { config } from '../config/config.js';
import { closeRabbitMQ, consumeQueue, createQueue } from '../config/rabbitmq.js';
import Notification from '../models/notification.model.js';
import MailerService from '../services/mailer.service.js';
import db from '../config/db.js';
import QRCode from 'qrcode';

const QUEUE_NAME = 'notification.worker.queue';
const ROUTING_KEY = 'notification.requested';

function buildEmailBody(notification) {
  const text = notification.content || '';
  const html = text
    ? `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;white-space:pre-line;">${text}</div>`
    : '';

  return { text, html };
}

function buildRegistrationEmailHtml({ recipientName, workshopTitle, registrationId, workshopStartTime, workshopSpeaker, workshopRoomName, qrCode }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#f8fbff;border:1px solid #dbe7ff;border-radius:16px;">
      <h2 style="margin:0 0 12px;color:#1e3a8a;">Registration confirmed</h2>
      <p style="margin:0 0 16px;">Hello ${recipientName || 'student'},</p>
      <p style="margin:0 0 12px;">Your registration for <strong>${workshopTitle}</strong> has been confirmed.</p>
      <div style="margin:16px 0;padding:16px;border-radius:12px;background:#ffffff;border:1px solid #c7d2fe;">
        <p style="margin:0 0 6px;"><strong>Workshop speaker:</strong> ${workshopSpeaker || 'TBA'}</p>
        <p style="margin:0 0 6px;"><strong>Workshop room:</strong> ${workshopRoomName || 'TBA'}</p>
        <p style="margin:0 0 6px;"><strong>Registration ID:</strong> ${registrationId}</p>
        <p style="margin:0 0 6px;"><strong>Workshop starts at:</strong> ${workshopStartTime}</p>
      </div>
      <div style="text-align:center;margin:20px 0;">
        <p style="margin:0 0 10px;font-weight:700;color:#1e3a8a;">QR Ticket</p>
        <img src="cid:registration-qr" alt="QR code for workshop registration" width="220" height="220" style="display:block;margin:0 auto;border:8px solid #fff;border-radius:12px;background:#fff;" />
        <p style="margin:12px 0 0;font-family:monospace;font-size:12px;word-break:break-all;color:#1d4ed8;">${qrCode}</p>
      </div>
      <p style="margin:16px 0 0;">Please keep this email for check-in and verification.</p>
    </div>
  `;
}

function buildRefundEmailHtml({ recipientName, workshopTitle, amount, reason, refundedAt }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#f8fbff;border:1px solid #dbe7ff;border-radius:16px;">
      <h2 style="margin:0 0 12px;color:#1e3a8a;">Payment refunded</h2>
      <p style="margin:0 0 16px;">Hello ${recipientName || 'student'},</p>
      <p style="margin:0 0 12px;">Your payment for <strong>${workshopTitle}</strong> has been refunded.</p>
      <div style="margin:8px 0;padding:12px;border-radius:8px;background:#ffffff;border:1px solid #c7d2fe;">
        <p style="margin:0 0 6px;"><strong>Amount:</strong> ${amount}</p>
        <p style="margin:0 0 6px;"><strong>Reason:</strong> ${reason}</p>
        <p style="margin:0 0 6px;"><strong>Processed at:</strong> ${refundedAt || ''}</p>
      </div>
      <p style="margin:16px 0 0;">If you have any questions, please contact our support team.</p>
    </div>
  `;
}

function buildWorkshopCancelledHtml({ recipientName, workshopTitle, workshopStartTime, workshopSpeaker, workshopRoomName, reason }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#fff7f6;border:1px solid #ffd1d1;border-radius:16px;">
      <h2 style="margin:0 0 12px;color:#b91c1c;">Workshop cancelled</h2>
      <p style="margin:0 0 16px;">Hello ${recipientName || 'participant'},</p>
      <p style="margin:0 0 12px;">We regret to inform you that the workshop <strong>${workshopTitle}</strong> has been cancelled.</p>
      <div style="margin:8px 0;padding:12px;border-radius:8px;background:#ffffff;border:1px solid #fee2e2;">
        <p style="margin:0 0 6px;"><strong>Speaker:</strong> ${workshopSpeaker || 'TBA'}</p>
        <p style="margin:0 0 6px;"><strong>Room:</strong> ${workshopRoomName || 'TBA'}</p>
        <p style="margin:0 0 6px;"><strong>Start time:</strong> ${workshopStartTime ? new Date(workshopStartTime).toLocaleString() : 'TBD'}</p>
        <p style="margin:0 0 6px;"><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
      </div>
      <p style="margin:16px 0 0;">If you paid, refund information will follow. For other questions, contact our support team.</p>
    </div>
  `;
}

async function handleNotificationRequestedEvent(message) {
  const payload = message?.payload || message;
  const notificationId = payload?.notification_id;
  const recipient = payload?.recipient;
  const subject = payload?.subject || 'UniHub notification';
  const content = payload?.content || '';
  const channel = payload?.channel || 'EMAIL';
  const template = payload?.template;

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
    if (template === 'registration-confirmed') {
      const body = buildEmailBody({ content });
      const qrImage = await QRCode.toBuffer(payload?.qr_code || content || subject, {
        type: 'png',
        width: 480,
        margin: 2,
        errorCorrectionLevel: 'H',
      });

      await MailerService.sendEmail({
        to: recipient,
        subject,
        text: body.text,
        html: buildRegistrationEmailHtml({
          recipientName: payload?.recipient_name,
          workshopTitle: payload?.workshop_title || subject,
          registrationId: payload?.registration_id || notificationId,
          workshopStartTime: payload?.workshop_start_time ? new Date(payload.workshop_start_time).toLocaleString() : 'N/A',
          workshopSpeaker: payload?.workshop_speaker,
          workshopRoomName: payload?.workshop_room_name,
          qrCode: payload?.qr_code || '',
        }) || body.html,
        attachments: [
          {
            filename: 'registration-qr.png',
            content: qrImage,
            cid: 'registration-qr',
          },
        ],
      });

    } else if (template === 'refund-confirmed') {
      const html = buildRefundEmailHtml({
        recipientName: payload?.recipient_name,
        workshopTitle: payload?.workshop_title || subject,
        amount: payload?.amount || payload?.payment_amount || '',
        reason: payload?.reason || payload?.refund_reason || '',
        refundedAt: payload?.refunded_at || payload?.refund_processed_at || '',
      });

      await MailerService.sendEmail({
        to: recipient,
        subject,
        text: content || html.replace(/<[^>]+>/g, ''),
        html,
      });

    } else if (template === 'workshop-cancelled') {
      const html = buildWorkshopCancelledHtml({
        recipientName: payload?.recipient_name,
        workshopTitle: payload?.workshop_title || subject,
        workshopStartTime: payload?.workshop_start_time,
        workshopSpeaker: payload?.workshop_speaker,
        workshopRoomName: payload?.workshop_room_name,
        reason: payload?.reason || '',
      });

      await MailerService.sendEmail({
        to: recipient,
        subject,
        text: content || html.replace(/<[^>]+>/g, ''),
        html,
      });

    } else {
      // Fallback: simple email
      const body = buildEmailBody({ content });
      await MailerService.sendEmail({ to: recipient, subject, text: body.text, html: body.html });
    }

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
