// ============================================================
// BakBak Chat - User Controller
// File: backend/src/controllers/userController.js
// Handles: Get Profile, Update Profile, Upload Avatar,
//          Change Password, Block/Unblock, Search Users, profile OTP
// ============================================================

const User = require('../models/User');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { sendOTP, verifyOTP } = require('../utils/otpHelper');

// ── GET USER PROFILE ──────────────────────────────────────────
// GET /api/v1/users/:id
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) return sendError(res, 404, 'User not found.');
    if (user.isBanned) return sendError(res, 403, 'This account has been suspended.');

    // Check if the requesting user is blocked by this user
    const isBlocked = user.blockedUsers.includes(req.user._id);
    if (isBlocked) return sendError(res, 403, 'You cannot view this profile.');

    return sendSuccess(res, 200, 'Profile fetched.', { user: user.toPublicProfile() });
  } catch (error) {
    next(error);
  }
};

// ── REQUEST PROFILE UPDATE OTP ─────────────────────────────────
// POST /api/v1/users/profile/request-otp  (Protected)
const requestProfileUpdateOTP = async (req, res, next) => {
  try {
    const { emailOrPhone } = req.body;
    if (!emailOrPhone) {
      return sendError(res, 400, 'Email or Phone is required to send verification code.');
    }

    // Check if taken by another user
    const query = emailOrPhone.includes('@')
      ? { email: emailOrPhone.toLowerCase().trim() }
      : { phone: emailOrPhone.trim() };

    const taken = await User.findOne({ ...query, _id: { $ne: req.user._id } });
    if (taken) {
      return sendError(res, 409, 'This email or phone number is already registered to another account.');
    }

    await sendOTP(emailOrPhone);
    return sendSuccess(res, 200, 'Verification code sent successfully.');
  } catch (error) {
    next(error);
  }
};

// ── UPDATE PROFILE ────────────────────────────────────────────
// PUT /api/v1/users/profile  (Protected)
const updateProfile = async (req, res, next) => {
  try {
    const { displayName, bio, statusText, email, phone, otp } = req.body;
    const user = await User.findById(req.user._id);

    // Only allow updating safe fields
    const updates = {};
    if (displayName !== undefined) {
      if (displayName.trim().length > 50) return sendError(res, 400, 'Display name too long (max 50 chars).');
      updates.displayName = displayName.trim();
    }
    if (bio !== undefined) {
      if (bio.trim().length > 200) return sendError(res, 400, 'Bio too long (max 200 chars).');
      updates.bio = bio.trim();
    }
    if (statusText !== undefined) {
      if (statusText.trim().length > 100) return sendError(res, 400, 'Status text too long (max 100 chars).');
      updates.statusText = statusText.trim();
    }

    // Email update (requires OTP verification)
    if (email !== undefined && email.toLowerCase().trim() !== user.email) {
      const emailLower = email.toLowerCase().trim();
      const emailTaken = await User.findOne({ email: emailLower, _id: { $ne: user._id } });
      if (emailTaken) return sendError(res, 409, 'Email is already in use by another account.');

      if (!otp) return sendError(res, 400, 'OTP is required to verify your new email address.');
      const isEmailValid = await verifyOTP(emailLower, otp);
      if (!isEmailValid) return sendError(res, 400, 'Invalid or expired OTP for email verification.');
      updates.email = emailLower;
    }

    // Phone update (requires OTP verification)
    if (phone !== undefined && phone.trim() !== (user.phone || '')) {
      const phoneTrimmed = phone.trim();
      const phoneTaken = await User.findOne({ phone: phoneTrimmed, _id: { $ne: user._id } });
      if (phoneTaken) return sendError(res, 409, 'Phone number is already in use by another account.');

      if (!otp) return sendError(res, 400, 'OTP is required to verify your new phone number.');
      const isPhoneValid = await verifyOTP(phoneTrimmed, otp);
      if (!isPhoneValid) return sendError(res, 400, 'Invalid or expired OTP for phone verification.');
      updates.phone = phoneTrimmed;
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,       // Return the updated document
      runValidators: true,
    });

    return sendSuccess(res, 200, 'Profile updated successfully.', {
      user: updatedUser.toPublicProfile(),
    });
  } catch (error) {
    next(error);
  }
};

// ── UPLOAD AVATAR ─────────────────────────────────────────────
// POST /api/v1/users/avatar  (multipart/form-data, field: "avatar")
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 400, 'No image file provided.');

    const user = await User.findById(req.user._id);

    // Delete old avatar from Cloudinary if it exists
    if (user.avatar?.publicId) {
      await deleteFromCloudinary(user.avatar.publicId);
    }

    // Upload new avatar to Cloudinary (compressed to 400x400 face-crop)
    const result = await uploadToCloudinary(req.file.buffer, 'avatars', 'image');

    user.avatar = { url: result.secure_url, publicId: result.public_id };
    await user.save();

    return sendSuccess(res, 200, 'Profile picture updated.', {
      avatar: user.avatar,
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE AVATAR ─────────────────────────────────────────────
// DELETE /api/v1/users/avatar
const deleteAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.avatar?.publicId) {
      await deleteFromCloudinary(user.avatar.publicId);
    }

    user.avatar = { url: '', publicId: '' };
    await user.save();

    return sendSuccess(res, 200, 'Profile picture removed.');
  } catch (error) {
    next(error);
  }
};

// ── CHANGE PASSWORD ───────────────────────────────────────────
// PUT /api/v1/users/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, 400, 'Both current and new password are required.');
    }

    if (newPassword.length < 8) {
      return sendError(res, 400, 'New password must be at least 8 characters.');
    }

    if (currentPassword === newPassword) {
      return sendError(res, 400, 'New password must be different from the current one.');
    }

    // Fetch user WITH password (normally excluded)
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return sendError(res, 401, 'Current password is incorrect.');
    }

    // Assign new password — pre-save hook re-hashes it automatically
    user.password = newPassword;
    await user.save();

    return sendSuccess(res, 200, 'Password changed successfully.');
  } catch (error) {
    next(error);
  }
};

// ── SEARCH USERS ──────────────────────────────────────────────
// GET /api/v1/users/search?q=username
// Exact Match Only system for email/phone
const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return sendError(res, 400, 'Search query is required.');
    }

    const queryStr = q.trim();

    // Exact Match Only for complete phone number or complete email ID
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },   // Exclude current user
        { isBanned: false },               // Exclude banned users
        {
          $or: [
            { email: queryStr.toLowerCase() },
            { phone: queryStr },
          ],
        },
      ],
    }).select('username displayName avatar statusText bio email phone isOnline lastSeen publicKey');

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User Not Found' });
    }

    return sendSuccess(res, 200, `Found ${users.length} users.`, { users });
  } catch (error) {
    next(error);
  }
};

// ── BLOCK USER ────────────────────────────────────────────────
// POST /api/v1/users/:id/block
const blockUser = async (req, res, next) => {
  try {
    const { id: targetId } = req.params;

    if (targetId === req.user._id.toString()) {
      return sendError(res, 400, 'You cannot block yourself.');
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) return sendError(res, 404, 'User not found.');

    const user = await User.findById(req.user._id);
    const alreadyBlocked = user.blockedUsers.includes(targetId);

    if (alreadyBlocked) {
      return sendError(res, 400, 'User is already blocked.');
    }

    user.blockedUsers.push(targetId);
    await user.save();

    return sendSuccess(res, 200, `${targetUser.displayName} has been blocked.`);
  } catch (error) {
    next(error);
  }
};

// ── UNBLOCK USER ──────────────────────────────────────────────
// POST /api/v1/users/:id/unblock
const unblockUser = async (req, res, next) => {
  try {
    const { id: targetId } = req.params;

    const user = await User.findById(req.user._id);
    const index = user.blockedUsers.indexOf(targetId);

    if (index === -1) {
      return sendError(res, 400, 'User is not in your blocked list.');
    }

    user.blockedUsers.splice(index, 1);
    await user.save();

    return sendSuccess(res, 200, 'User unblocked successfully.');
  } catch (error) {
    next(error);
  }
};

// ── SAVE E2EE PUBLIC KEY ──────────────────────────────────────
// PUT /api/v1/users/public-key
const savePublicKey = async (req, res, next) => {
  try {
    const { publicKey } = req.body;

    if (!publicKey) return sendError(res, 400, 'Public key is required.');

    await User.findByIdAndUpdate(req.user._id, { publicKey });

    return sendSuccess(res, 200, 'Public key registered successfully.');
  } catch (error) {
    next(error);
  }
};

// ── GET BLOCKED USERS LIST ────────────────────────────────────
// GET /api/v1/users/blocked
const getBlockedUsers = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('blockedUsers', 'username displayName avatar');

    return sendSuccess(res, 200, 'Blocked users fetched.', {
      blockedUsers: user.blockedUsers,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  changePassword,
  searchUsers,
  blockUser,
  unblockUser,
  savePublicKey,
  getBlockedUsers,
  requestProfileUpdateOTP,
};
