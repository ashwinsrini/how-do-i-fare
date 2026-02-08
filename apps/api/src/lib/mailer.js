import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporter;

function getTransporter() {
  if (transporter) return transporter;

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

export async function sendOtp(email, code) {
  const transport = getTransporter();

  await transport.sendMail({
    from: config.smtp.from,
    to: email,
    subject: 'Your verification code - Dev Leaderboard',
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Verify your email</h2>
        <p style="color: #555;">Your verification code is:</p>
        <div style="background: #f4f4f4; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #111;">${code}</span>
        </div>
        <p style="color: #888; font-size: 14px;">This code expires in 10 minutes.</p>
      </div>
    `,
  });
}
