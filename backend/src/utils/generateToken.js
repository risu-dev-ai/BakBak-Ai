// ============================================================
// BakBak Chat - JWT Utility Helper
// File: backend/src/utils/generateToken.js
// ============================================================

const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT token for a user.
 * @param {string} userId - MongoDB ObjectId as string
 * @returns {string} Signed JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

module.exports = generateToken;
