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
  const digits = code.split('');

  await transport.sendMail({
    from: config.smtp.from,
    to: email,
    subject: 'Your verification code - TeamMetrics',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
          <div style="display: inline-block; margin-bottom: 12px;">
            <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjIiLz48cmVjdCB4PSI3IiB5PSIxNiIgd2lkdGg9IjQiIGhlaWdodD0iMTAiIHJ4PSIxIiBmaWxsPSJ3aGl0ZSIvPjxyZWN0IHg9IjE0IiB5PSIxMSIgd2lkdGg9IjQiIGhlaWdodD0iMTUiIHJ4PSIxIiBmaWxsPSJ3aGl0ZSIvPjxyZWN0IHg9IjIxIiB5PSI2IiB3aWR0aD0iNCIgaGVpZ2h0PSIyMCIgcng9IjEiIGZpbGw9IndoaXRlIi8+PC9zdmc+" alt="TeamMetrics" width="36" height="36" style="vertical-align: middle;" />
          </div>
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; letter-spacing: -0.3px;">TeamMetrics</h1>
        </div>

        <!-- Body -->
        <div style="padding: 36px 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #0f172a; font-size: 20px; font-weight: 600; margin: 0 0 8px 0;">Verify your email</h2>
          <p style="color: #64748b; font-size: 15px; line-height: 1.5; margin: 0 0 24px 0;">Enter this code to complete your verification:</p>

          <!-- OTP Code -->
          <div style="text-align: center; margin: 0 0 24px 0;">
            <div style="display: inline-block; background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 12px; padding: 20px 28px;">
              ${digits.map(d => `<span style="font-size: 36px; font-weight: 700; letter-spacing: 2px; color: #059669; font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; padding: 0 4px;">${d}</span>`).join('')}
            </div>
          </div>

          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0 0 4px 0;">This code expires in <strong style="color: #64748b;">10 minutes</strong>.</p>

          <!-- Divider -->
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

          <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0;">If you didn't request this email, you can safely ignore it. No action is needed.</p>
        </div>
      </div>
    `,
  });
}
