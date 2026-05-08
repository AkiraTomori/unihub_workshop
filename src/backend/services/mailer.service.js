import nodemailer from 'nodemailer';
import { config } from '../config/config.js';

let transporter = null;

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
  static async sendEmail({ to, subject, text, html }) {
    const mailTransporter = getTransporter();

    return mailTransporter.sendMail({
      from: config.smtp.from || config.smtp.user,
      to,
      subject,
      text: text || '',
      html: html || text || '',
    });
  }
}

export default MailerService;
