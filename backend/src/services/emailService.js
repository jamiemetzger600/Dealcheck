import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

// Create reusable transporter
let transporter;

if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT == 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  console.log('✅ Email service configured');
} else {
  console.warn('⚠️  Email service not configured (missing SMTP settings)');
}

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 */
/**
 * Send email. When SMTP is unset, returns { sent: false } without throwing
 * so in-app alerts still work (Talk banner / user_alerts). Callers that need
 * delivery certainty should check the return value.
 */
export function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST?.trim());
}

export async function sendEmail({ to, subject, html }) {
  if (!transporter) {
    console.warn('[email] skipped (SMTP not configured)', { to, subject });
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Vettr" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });

    console.log('[email] sent', { to, subject, messageId: info.messageId });
    return { sent: true, messageId: info.messageId, info };

  } catch (error) {
    console.error('[email] send failed', { to, subject, error: error.message });
    throw error;
  }
}

/**
 * Send test email
 */
export async function sendTestEmail(to) {
  return sendEmail({
    to,
    subject: 'Vettr Email Test',
    html: '<h1>Email service is working!</h1><p>You can now receive deal-matching notifications.</p>'
  });
}
