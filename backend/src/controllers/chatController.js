// ============================================================
// BakBak Chat - Chat Controller
// File: backend/src/controllers/chatController.js
// ============================================================

const { Chat } = require('../models/Chat');
const User = require('../models/User');

/**
 * Create or retrieve a 1-on-1 direct chat
 * POST /api/v1/chats
 */
exports.createOrGetDirectChat = async (req, res, next) => {
  try {
    const { recipientId } = req.body;
    const currentUserId = req.user._id;

    if (!recipientId) {
      return res.status(400).json({ success: false, message: 'Recipient ID is required.' });
    }

    if (recipientId.toString() === currentUserId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot start a chat with yourself.' });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found.' });
    }

    // Find existing direct chat between these two users
    let chat = await Chat.findOne({
      chatType: 'direct',
      participants: { $all: [currentUserId, recipientId], $size: 2 }
    })
    .populate('participants', 'username displayName avatar isOnline lastSeen publicKey')
    .populate('lastMessage');

    // If chat doesn't exist, create a new one
    if (!chat) {
      chat = await Chat.create({
        chatType: 'direct',
        participants: [currentUserId, recipientId]
      });

      chat = await Chat.findById(chat._id)
        .populate('participants', 'username displayName avatar isOnline lastSeen publicKey');
    }

    res.status(200).json({ success: true, data: chat });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new group chat
 * POST /api/v1/chats/group
 */
exports.createGroupChat = async (req, res, next) => {
  try {
    const { groupName, groupDescription, participants: participantIds } = req.body;
    const currentUserId = req.user._id;

    if (!groupName || groupName.trim() === '') {
      return res.status(400).json({ success: false, message: 'Group name is required.' });
    }

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one participant is required for a group.' });
    }

    // Add current user to participants list if not already there
    const uniqueParticipants = Array.from(new Set([...participantIds, currentUserId.toString()]));

    const chat = await Chat.create({
      chatType: 'group',
      groupName: groupName.trim(),
      groupDescription: groupDescription ? groupDescription.trim() : '',
      participants: uniqueParticipants,
      admins: [currentUserId],
      createdBy: currentUserId
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', 'username displayName avatar isOnline lastSeen publicKey')
      .populate('admins', 'username displayName avatar')
      .populate('createdBy', 'username displayName');

    res.status(201).json({ success: true, data: populatedChat });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all chats for the logged-in user
 * GET /api/v1/chats
 */
exports.getUserChats = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    const chats = await Chat.find({
      participants: currentUserId
    })
    .populate('participants', 'username displayName avatar isOnline lastSeen publicKey')
    .populate({
      path: 'lastMessage',
      populate: {
        path: 'sender',
        select: 'username displayName avatar'
      }
    })
    .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, count: chats.length, data: chats });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single chat by ID
 * GET /api/v1/chats/:id
 */
exports.getChatById = async (req, res, next) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      participants: req.user._id
    })
    .populate('participants', 'username displayName avatar isOnline lastSeen publicKey')
    .populate('admins', 'username displayName avatar')
    .populate('createdBy', 'username displayName')
    .populate('lastMessage');

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found or access denied.' });
    }

    res.status(200).json({ success: true, data: chat });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Group info (Name, description, avatar)
 * PUT /api/v1/chats/:id/group
 */
exports.updateGroupInfo = async (req, res, next) => {
  try {
    const { groupName, groupDescription } = req.body;
    const currentUserId = req.user._id;

    const chat = await Chat.findOne({ _id: req.params.id, participants: currentUserId });

    if (!chat || chat.chatType !== 'group') {
      return res.status(404).json({ success: false, message: 'Group chat not found or access denied.' });
    }

    // Check if user is an admin of the group
    const isAdmin = chat.admins.some(adminId => adminId.toString() === currentUserId.toString());
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only group admins can update group information.' });
    }

    if (groupName) chat.groupName = groupName.trim();
    if (groupDescription !== undefined) chat.groupDescription = groupDescription.trim();

    await chat.save();

    const updatedChat = await Chat.findById(chat._id)
      .populate('participants', 'username displayName avatar isOnline lastSeen publicKey')
      .populate('admins', 'username displayName avatar');

    res.status(200).json({ success: true, data: updatedChat });
  } catch (error) {
    next(error);
  }
};

/**
 * Add participants to a group chat
 * PUT /api/v1/chats/:id/group/add
 */
exports.addGroupParticipants = async (req, res, next) => {
  try {
    const { participants: newParticipantIds } = req.body;
    const currentUserId = req.user._id;

    if (!newParticipantIds || !Array.isArray(newParticipantIds) || newParticipantIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Participant IDs array is required.' });
    }

    const chat = await Chat.findOne({ _id: req.params.id, participants: currentUserId });

    if (!chat || chat.chatType !== 'group') {
      return res.status(404).json({ success: false, message: 'Group chat not found or access denied.' });
    }

    // Check if user is admin
    const isAdmin = chat.admins.some(adminId => adminId.toString() === currentUserId.toString());
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only group admins can add participants.' });
    }

    // filter existing participants
    const existingParticipantsStr = chat.participants.map(id => id.toString());
    const toAdd = newParticipantIds.filter(id => !existingParticipantsStr.includes(id));

    if (toAdd.length === 0) {
      return res.status(400).json({ success: false, message: 'All specified users are already in the group.' });
    }

    chat.participants.push(...toAdd);
    await chat.save();

    const updatedChat = await Chat.findById(chat._id)
      .populate('participants', 'username displayName avatar isOnline lastSeen publicKey')
      .populate('admins', 'username displayName avatar');

    res.status(200).json({ success: true, data: updatedChat });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove participant or leave a group chat
 * PUT /api/v1/chats/:id/group/remove
 */
exports.removeGroupParticipant = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID to remove is required.' });
    }

    const chat = await Chat.findOne({ _id: req.params.id, participants: currentUserId });

    if (!chat || chat.chatType !== 'group') {
      return res.status(404).json({ success: false, message: 'Group chat not found or access denied.' });
    }

    const isTargetingSelf = userId.toString() === currentUserId.toString();
    const isAdmin = chat.admins.some(adminId => adminId.toString() === currentUserId.toString());

    // User can remove themselves (leave group), but to remove others they must be an admin
    if (!isTargetingSelf && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only group admins can remove other participants.' });
    }

    // Cannot remove the creator/last admin unless there is another admin
    if (isTargetingSelf && chat.admins.length === 1 && chat.admins.includes(currentUserId) && chat.participants.length > 1) {
      return res.status(400).json({
        success: false,
        message: 'You are the only admin. Please promote another participant to admin before leaving.'
      });
    }

    // Remove user from participants
    chat.participants = chat.participants.filter(pId => pId.toString() !== userId.toString());
    
    // Remove from admins too if they were admin
    chat.admins = chat.admins.filter(aId => aId.toString() !== userId.toString());

    // If no participants left, delete the chat
    if (chat.participants.length === 0) {
      await Chat.findByIdAndDelete(chat._id);
      return res.status(200).json({ success: true, message: 'Group empty. Chat deleted.' });
    }

    await chat.save();

    const updatedChat = await Chat.findById(chat._id)
      .populate('participants', 'username displayName avatar isOnline lastSeen publicKey')
      .populate('admins', 'username displayName avatar');

    res.status(200).json({ success: true, data: updatedChat });
  } catch (error) {
    next(error);
  }
};
