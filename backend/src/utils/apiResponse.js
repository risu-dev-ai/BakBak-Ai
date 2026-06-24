// ============================================================
// BakBak Chat - Response Helper Utilities
// File: backend/src/utils/apiResponse.js
// ============================================================

/**
 * Send a standardized success response.
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {*} data
 */
const sendSuccess = (res, statusCode = 200, message = 'Success', data = null) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  return res.status(statusCode).json(response);
};

/**
 * Send a standardized error response.
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 */
const sendError = (res, statusCode = 500, message = 'Internal Server Error') => {
  return res.status(statusCode).json({ success: false, message });
};

/**
 * Create a custom error with a status code (to pass to next())
 * @param {string} message
 * @param {number} statusCode
 */
const createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

module.exports = { sendSuccess, sendError, createError };
