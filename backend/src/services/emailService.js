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
export async function sendEmail({ to, subject, html }) {
  if (!transporter) {
    console.warn('Email not sent - transporter not configured');
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Dealcheck" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });

    console.log('📧 Email sent:', info.messageId);
    return info;

  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

/**
 * Send test email
 */
export async function sendTestEmail(to) {
  return sendEmail({
    to,
    subject: 'Dealcheck Email Test',
    html: '<h1>Email service is working!</h1><p>You can now receive deal-matching notifications.</p>'
  });
}
