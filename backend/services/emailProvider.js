const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * Email Provider — abstraction layer over the underlying transport.
 *
 * Swap implementation: replace the createTransport call below with any
 * compatible SMTP-like transport (e.g. Brevo SMTP, SendGrid SMTP relay,
 * AWS SES SMTP) and this file is the only thing that changes.
 *
 * API shape that callers must use:
 *   sendEmail({ to, subject, html, text? })
 */

const EMAIL_ENABLED = process.env.EMAIL_ENABLED !== 'false'; // default: enabled

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Send an email.
 * @param {object} options
 * @param {string} options.to      - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html    - HTML body
 * @param {string} [options.text]  - Optional plain-text fallback
 */
async function sendEmail({ to, subject, html, text }) {
  if (!EMAIL_ENABLED) {
    logger.info(`[emailProvider] Email disabled — skipping send to ${to}: "${subject}"`);
    return;
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn('[emailProvider] SMTP_USER or SMTP_PASS not configured — skipping email.');
    return;
  }

  try {
    const info = await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || '"IntelliHire" <noreply@intellihire.com>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''), // auto plain-text strip
    });
    logger.info(`[emailProvider] Email sent to ${to} — messageId: ${info.messageId}`);
  } catch (err) {
    // Non-fatal: log the failure but never crash the calling flow
    logger.error(`[emailProvider] Failed to send email to ${to}: ${err.message}`);
  }
}

module.exports = { sendEmail };
