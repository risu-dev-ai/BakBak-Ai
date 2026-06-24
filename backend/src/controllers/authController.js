// ============================================================
// BakBak Chat - Auth Controller
// File: backend/src/controllers/authController.js
// Handles: Register, Login, Get Current User, Logout, OTP Verification
// ============================================================

const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { sendOTP, verifyOTP } = require('../utils/otpHelper');

// ── REGISTER ─────────────────────────────────────────────────
// POST /api/v1/auth/register
const register = async (req, res, next) => {
  try {
    const { username, email, phone, password, displayName } = req.body;

    // Basic presence validation
    if (!username || !email || !password) {
      return sendError(res, 400, 'Username, email, and password are required.');
    }

    // Check for existing user (email OR username OR phone)
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() },
        ...(phone ? [{ phone }] : []),
      ],
    });

    if (existingUser) {
      let field = 'An account';
      if (existingUser.email === email.toLowerCase()) field = 'Email';
      else if (existingUser.username === username.toLowerCase()) field = 'Username';
      else if (phone && existingUser.phone === phone) field = 'Phone number';
      return sendError(res, 409, `${field} already exists. Please use a different one.`);
    }

    // Create user — password is hashed by the pre-save hook in User.js
    // By default, accounts are unverified (isVerified: false)
    const user = await User.create({
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : undefined,
      password,
      displayName: displayName?.trim() || username,
      isVerified: false, 
    });

    // Send OTP to email
    await sendOTP(user.email);

    return sendSuccess(res, 201, 'Registration pending verification. Verification code sent to email.', {
      isVerified: false,
      email: user.email,
    });
  } catch (error) {
    next(error); // Pass to global error handler
  }
};

// ── LOGIN ─────────────────────────────────────────────────────
// POST /api/v1/auth/login
const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return sendError(res, 400, 'Identifier (email/username/phone) and password are required.');
    }

    const identifierLower = identifier.toLowerCase().trim();

    // Find user by email, username, or phone
    const user = await User.findOne({
      $or: [
        { email: identifierLower },
        { username: identifierLower },
        { phone: identifier.trim() },
      ],
    }).select('+password');

    if (!user) {
      return sendError(res, 401, 'Invalid credentials. Please check your details.');
    }

    // Check ban status
    if (user.isBanned) {
      return sendError(res, 403, `Account banned: ${user.banReason || 'Terms violation.'}`);
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 401, 'Invalid credentials. Please check your details.');
    }

    // Check verification status
    if (!user.isVerified) {
      // Send fresh OTP
      await sendOTP(user.email);
      return sendSuccess(res, 202, 'Verification required. Verification code sent to email.', {
        isVerified: false,
        email: user.email,
      });
    }

    // Generate JWT
    const token = generateToken(user._id);

    return sendSuccess(res, 200, 'Login successful. Welcome back!', {
      user: user.toPublicProfile(),
      token,
    });
  } catch (error) {
    next(error);
  }
};

// ── VERIFY OTP ────────────────────────────────────────────────
// POST /api/v1/auth/verify-otp
const verifyUserOTP = async (req, res, next) => {
  try {
    const { emailOrPhone, otp } = req.body;

    if (!emailOrPhone || !otp) {
      return sendError(res, 400, 'Email/Phone and OTP code are required.');
    }

    const isValid = await verifyOTP(emailOrPhone, otp);
    if (!isValid) {
      return sendError(res, 400, 'Invalid or expired verification code.');
    }

    // Find the user and verify them
    const user = await User.findOne({
      $or: [
        { email: emailOrPhone.toLowerCase().trim() },
        { phone: emailOrPhone.trim() }
      ],
    });

    if (!user) {
      return sendError(res, 404, 'User not found.');
    }

    user.isVerified = true;
    await user.save();

    // Generate JWT
    const token = generateToken(user._id);

    return sendSuccess(res, 200, 'Verification successful!', {
      user: user.toPublicProfile(),
      token,
    });
  } catch (error) {
    next(error);
  }
};

// ── RESEND OTP ────────────────────────────────────────────────
// POST /api/v1/auth/resend-otp
const resendUserOTP = async (req, res, next) => {
  try {
    const { emailOrPhone } = req.body;
    if (!emailOrPhone) {
      return sendError(res, 400, 'Email or Phone is required.');
    }

    await sendOTP(emailOrPhone);
    return sendSuccess(res, 200, 'Verification code resent successfully.');
  } catch (error) {
    next(error);
  }
};

// ── GET CURRENT USER ──────────────────────────────────────────
// GET /api/v1/auth/me  (Protected)
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return sendError(res, 404, 'User not found.');

    return sendSuccess(res, 200, 'User fetched successfully.', {
      user: user.toPublicProfile(),
    });
  } catch (error) {
    next(error);
  }
};

// ── LOGOUT ────────────────────────────────────────────────────
// POST /api/v1/auth/logout  (Protected)
const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      isOnline: false,
      lastSeen: new Date(),
    });

    return sendSuccess(res, 200, 'Logged out successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  verifyUserOTP,
  resendUserOTP,
};
