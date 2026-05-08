import nodemailer from 'nodemailer';
import { config } from '../config/config.js';

let transporter = null;

function resolveFromAddress() {
  const configuredFrom = config.smtp.from?.trim();
  const user = config.smtp.user?.trim();

  if (configuredFrom && !configuredFrom.includes('your-email@gmail.com')) {
    return configuredFrom;
  }

  return user;
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    throw new Error('SMTP configuration is incomplete');
  }

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });

  return transporter;
}

export class MailerService {
  static async sendEmail({ to, subject, text, html, attachments = [], cc = [], bcc = [] }) {
    const mailTransporter = getTransporter();

    return mailTransporter.sendMail({
      from: resolveFromAddress(),
      to,
      ...(cc.length ? { cc } : {}),
      ...(bcc.length ? { bcc } : {}),
      subject,
      text: text || '',
      html: html || text || '',
      ...(attachments.length ? { attachments } : {}),
    });
  }
}

export default MailerService;
