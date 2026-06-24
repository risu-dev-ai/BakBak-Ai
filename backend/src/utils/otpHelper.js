// ============================================================
// BakBak Chat - OTP Generator and Sender Helper
// File: backend/src/utils/otpHelper.js
// ============================================================

const OTP = require('../models/OTP');
const nodemailer = require('nodemailer');

/**
 * Generate a random 6-digit numeric OTP
 * @returns {string}
 */
const generateOTPCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Save OTP to database and send it via Email (or log it to console)
 * @param {string} emailOrPhone - User's email or phone number
 * @returns {Promise<string>} - The generated OTP code
 */
const sendOTP = async (emailOrPhone) => {
  const code = generateOTPCode();

  // Save to database (will overwrite any existing active OTP for this email/phone)
  await OTP.deleteMany({ emailOrPhone });
  await OTP.create({ emailOrPhone, otp: code });

  // Print to terminal console for local debugging/development
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  🔑 [BakBak OTP Verification]`);
  console.log(`  📧 Target: ${emailOrPhone}`);
  console.log(`  🔢 Code  : ${code}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // If email (contains '@'), attempt to send it via Nodemailer
  if (emailOrPhone.includes('@')) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER || 'mock-user',
          pass: process.env.SMTP_PASS || 'mock-pass',
        },
      });

      // Send mail if real configurations exist
      if (process.env.SMTP_USER) {
        await transporter.sendMail({
          from: `"BakBak Support" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to: emailOrPhone,
          subject: 'Your BakBak Verification Code',
          text: `Your verification code is: ${code}. It expires in 10 minutes.`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #075E54; text-align: center;">BakBak Chat</h2>
              <p>Hello,</p>
              <p>You requested a verification code to authenticate your account. Please use the following One-Time Password (OTP):</p>
              <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #075E54; background: #f4f6f5; padding: 10px 20px; border-radius: 5px;">${code}</span>
              </div>
              <p style="color: #666; font-size: 13px;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
            </div>
          `,
        });
        console.log(`📬 Real email OTP sent successfully to ${emailOrPhone}`);
      }
    } catch (err) {
      console.error('⚠️ Failed to send real email OTP:', err.message);
    }
  }

  return code;
};

/**
 * Verify if the provided OTP is correct and active
 * @param {string} emailOrPhone
 * @param {string} code
 * @returns {Promise<boolean>}
 */
const verifyOTP = async (emailOrPhone, code) => {
  // Find the most recent active OTP entry
  const record = await OTP.findOne({ emailOrPhone, otp: code });
  if (!record) return false;

  // Delete OTP after verification to prevent replay attacks
  await OTP.deleteMany({ emailOrPhone });
  return true;
};

module.exports = {
  sendOTP,
  verifyOTP,
};
