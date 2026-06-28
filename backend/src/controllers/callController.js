// ============================================================
// BakBak Chat - Call Controller
// File: backend/src/controllers/callController.js
// ============================================================

const Call = require('../models/Call');
const User = require('../models/User');

/**
 * Log a new call session
 * POST /api/v1/calls
 */
exports.createCallLog = async (req, res) => {
  try {
    const { receiverId, callType, status } = req.body;

    if (!receiverId || !callType) {
      return res.status(400).json({ success: false, message: 'Receiver and CallType are required' });
    }

    const callLog = await Call.create({
      caller: req.user._id,
      receiver: receiverId,
      callType,
      status: status || 'missed',
      duration: 0
    });

    const populated = await callLog.populate([
      { path: 'caller', select: 'username displayName avatar' },
      { path: 'receiver', select: 'username displayName avatar' }
    ]);

    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Update call session log (when call ends, accepts, or rejects)
 * PATCH /api/v1/calls/:callId
 */
exports.updateCallLog = async (req, res) => {
  try {
    const { callId } = req.params;
    const { status, duration } = req.body;

    const callLog = await Call.findById(callId);
    if (!callLog) {
      return res.status(404).json({ success: false, message: 'Call log not found' });
    }

    // Ensure the user updating is part of the call
    if (
      callLog.caller.toString() !== req.user._id.toString() &&
      callLog.receiver.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this call log' });
    }

    if (status) callLog.status = status;
    if (duration !== undefined) callLog.duration = duration;

    await callLog.save();

    const populated = await callLog.populate([
      { path: 'caller', select: 'username displayName avatar' },
      { path: 'receiver', select: 'username displayName avatar' }
    ]);

    res.status(200).json({
      success: true,
      data: populated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get call history logs for the current user
 * GET /api/v1/calls
 */
exports.getCallHistory = async (req, res) => {
  try {
    const history = await Call.find({
      $or: [
        { caller: req.user._id },
        { receiver: req.user._id }
      ]
    })
    .sort({ createdAt: -1 })
    .populate('caller', 'username displayName avatar')
    .populate('receiver', 'username displayName avatar');

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
