import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { config } from '../../config.js';
import { User, OtpCode } from '../../db/models/index.js';
import { sendOtp } from '../../lib/mailer.js';

const SALT_ROUNDS = 12;
const OTP_TTL_MINUTES = 10;
const OTP_RATE_LIMIT_SECONDS = 60; // Min interval between OTP sends per email
const OTP_MAX_ATTEMPTS = 5; // Max verification attempts per email in the TTL window

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    config.jwt.secret,
    { algorithm: 'HS256', expiresIn: '15d' },
  );
}

/**
 * Check if an OTP was sent to this email too recently (rate limit).
 */
async function checkOtpRateLimit(email) {
  const cutoff = new Date(Date.now() - OTP_RATE_LIMIT_SECONDS * 1000);
  const recent = await OtpCode.findOne({
    where: {
      email,
      createdAt: { [Op.gt]: cutoff },
    },
    order: [['createdAt', 'DESC']],
  });
  if (recent) {
    throw Object.assign(
      new Error('Please wait before requesting another verification code'),
      { statusCode: 429 },
    );
  }
}

/**
 * Check if too many failed OTP verification attempts for this email.
 */
async function checkOtpAttemptLimit(email) {
  const window = new Date(Date.now() - OTP_TTL_MINUTES * 60 * 1000);
  const totalFailed = await OtpCode.sum('failedAttempts', {
    where: {
      email,
      createdAt: { [Op.gt]: window },
    },
  }) || 0;
  if (totalFailed >= OTP_MAX_ATTEMPTS) {
    throw Object.assign(
      new Error('Too many verification attempts. Please wait and try again.'),
      { statusCode: 429 },
    );
  }
}

export async function signup({ name, email, password }) {
  // Rate limit OTP sends early to prevent repeated password changes
  await checkOtpRateLimit(email);

  const existing = await User.findOne({ where: { email } });
  if (existing && existing.isVerified) {
    throw Object.assign(new Error('An account with this email already exists'), { statusCode: 409 });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  let user;
  if (existing && !existing.isVerified) {
    await existing.update({ name, passwordHash });
    user = existing;
  } else {
    user = await User.create({ name, email, passwordHash });
  }

  // Generate and send OTP
  const code = generateOtp();
  await OtpCode.create({
    email,
    code,
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
  });

  await sendOtp(email, code);

  return { message: 'Verification code sent to your email' };
}

export async function verifyOtp({ email, code }) {
  await checkOtpAttemptLimit(email);

  const otpRecord = await OtpCode.findOne({
    where: {
      email,
      code,
      used: false,
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [['createdAt', 'DESC']],
  });

  if (!otpRecord) {
    // Increment failed attempts on the most recent OTP for this email
    const latestOtp = await OtpCode.findOne({
      where: { email, used: false, expiresAt: { [Op.gt]: new Date() } },
      order: [['createdAt', 'DESC']],
    });
    if (latestOtp) {
      await latestOtp.increment('failedAttempts');
    }
    throw Object.assign(new Error('Invalid or expired verification code'), { statusCode: 400 });
  }

  await otpRecord.update({ used: true });

  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  await user.update({ isVerified: true, lastLoginAt: new Date() });

  const token = signToken(user);
  return { token, user: { id: user.id, name: user.name, email: user.email } };
}

export async function signin({ email, password }) {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  if (!user.isVerified) {
    // Rate limit before resending OTP
    await checkOtpRateLimit(email);

    const code = generateOtp();
    await OtpCode.create({
      email,
      code,
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    });
    await sendOtp(email, code);

    throw Object.assign(new Error('Please verify your email first. A new verification code has been sent.'), { statusCode: 403, needsVerification: true });
  }

  await user.update({ lastLoginAt: new Date() });

  const token = signToken(user);
  return { token, user: { id: user.id, name: user.name, email: user.email } };
}

export async function getMe(userId) {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'name', 'email', 'isVerified', 'lastLoginAt', 'createdAt'],
  });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
  return user;
}
