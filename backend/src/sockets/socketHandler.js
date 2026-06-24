// ============================================================
// BakBak Chat - Socket.io Main Handler
// File: backend/src/sockets/socketHandler.js
// ============================================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Main Socket.io handler — all real-time event logic lives here.
 * @param {import('socket.io').Server} io
 */
const socketHandler = (io) => {
  // ── Socket Authentication Middleware ────────────────────────
  // Verifies JWT token on each socket connection attempt
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication required: no token provided.'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user || user.isBanned) {
        return next(new Error('Authentication failed: user not found or banned.'));
      }

      // Attach the authenticated user to this socket
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication failed: invalid or expired token.'));
    }
  });

  // ── Connection Handler ────────────────────────────────────
  io.on('connection', async (socket) => {
    console.log(`🔌 Socket connected: ${socket.user.username} (${socket.id})`);

    // Mark user as online in DB
    await User.findByIdAndUpdate(socket.user._id, { isOnline: true });

    // Join user's personal room (for direct messages)
    socket.join(socket.user._id.toString());

    // Broadcast online status to all clients
    io.emit('user:online', { userId: socket.user._id });

    // ── Phase 3 Events (Chat) — registered but not fully active yet ──
    socket.on('chat:join', (chatId) => {
      socket.join(chatId);
      console.log(`📬 ${socket.user.username} joined room: ${chatId}`);
    });

    socket.on('chat:leave', (chatId) => {
      socket.leave(chatId);
    });

    // ── Phase 3: Typing Indicators ─────────────────────────────
    socket.on('typing:start', ({ chatId }) => {
      socket.to(chatId).emit('typing:start', {
        chatId,
        userId: socket.user._id,
        username: socket.user.username,
      });
    });

    socket.on('typing:stop', ({ chatId }) => {
      socket.to(chatId).emit('typing:stop', {
        chatId,
        userId: socket.user._id,
      });
    });

    // ── Phase 3: Message Delivery Ticks ─────────────────────────
    socket.on('message:delivered', async ({ messageId, chatId }) => {
      try {
        const { Message } = require('../models/Chat');
        const updatedMessage = await Message.findOneAndUpdate(
          { _id: messageId, 'deliveredTo.userId': { $ne: socket.user._id } },
          {
            $push: {
              deliveredTo: {
                userId: socket.user._id,
                deliveredAt: new Date()
              }
            }
          },
          { new: true }
        );

        if (updatedMessage) {
          io.to(chatId).emit('message:delivered', {
            messageId,
            chatId,
            userId: socket.user._id,
            deliveredAt: new Date()
          });
        }
      } catch (err) {
        console.error('Error marking message as delivered:', err.message);
      }
    });

    // ── Phase 6: WebRTC Signaling Relay ───────────────────────
    // These events relay WebRTC offer/answer/ICE candidates between peers
    socket.on('call:offer', ({ to, offer, callType }) => {
      io.to(to).emit('call:incoming', {
        from: socket.user._id,
        fromName: socket.user.displayName,
        fromAvatar: socket.user.avatar?.url,
        offer,
        callType, // 'audio' | 'video'
      });
    });

    socket.on('call:answer', ({ to, answer }) => {
      io.to(to).emit('call:answer', { from: socket.user._id, answer });
    });

    socket.on('call:ice-candidate', ({ to, candidate }) => {
      io.to(to).emit('call:ice-candidate', { from: socket.user._id, candidate });
    });

    socket.on('call:end', ({ to }) => {
      io.to(to).emit('call:ended', { from: socket.user._id });
    });

    socket.on('call:reject', ({ to }) => {
      io.to(to).emit('call:rejected', { from: socket.user._id });
    });

    // ── Disconnect Handler ─────────────────────────────────────
    socket.on('disconnect', async (reason) => {
      console.log(`❌ Socket disconnected: ${socket.user.username} — Reason: ${reason}`);

      // Mark user as offline and update lastSeen
      await User.findByIdAndUpdate(socket.user._id, {
        isOnline: false,
        lastSeen: new Date(),
      });

      // Broadcast offline status
      io.emit('user:offline', {
        userId: socket.user._id,
        lastSeen: new Date(),
      });
    });

    // ── Error Handler ─────────────────────────────────────────
    socket.on('error', (err) => {
      console.error(`Socket error for ${socket.user?.username}:`, err.message);
    });
  });
};

module.exports = socketHandler;
