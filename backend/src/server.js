// ============================================================
// BakBak Chat - Main Server Entry Point
// File: backend/src/server.js
// ============================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Load environment variables FIRST before anything else
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('./config/db');
const socketHandler = require('./sockets/socketHandler');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

// ── Initialize Express App ────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);

// ── Socket.io Setup ───────────────────────────────────────────
// ── CORS Origin Helper ────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://bak-bak-chat.vercel.app',
];
if (process.env.CLIENT_URL) {
  const envOrigins = process.env.CLIENT_URL.split(',').map(o => o.trim().replace(/\/$/, ''));
  allowedOrigins.push(...envOrigins);
}

const checkOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  
  const normalizedOrigin = origin.replace(/\/$/, '');
  const isAllowed = allowedOrigins.some(allowed => normalizedOrigin === allowed);
  
  if (isAllowed || normalizedOrigin.endsWith('.vercel.app')) {
    callback(null, true);
  } else {
    console.warn(`⚠️ Blocked by CORS: ${origin}`);
    callback(null, false); // Block origin but don't crash server with uncaught exception
  }
};

// ── Socket.io Setup ───────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: checkOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,  // 60s before declaring connection dead
});

// Store io on app instance to use in controllers
app.set('io', io);

// ── Security Middleware ───────────────────────────────────────
app.use(helmet()); // Sets security HTTP headers

// ── CORS Configuration ────────────────────────────────────────
app.use(
  cors({
    origin: checkOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Rate Limiting (Anti-Spam / DDoS Protection) ───────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,                   // max 200 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api/', limiter);

// ── Request Parsing ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging (development only) ────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Static Files (uploaded media) ────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Health Check Route ────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🟢 BakBak API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/v1', apiRoutes);

// ── Socket.io Event Handlers ──────────────────────────────────
socketHandler(io);

// ── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler ──────────────────────────────────────
app.use(errorHandler);

// ── Connect DB & Start Server ─────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    httpServer.listen(PORT, () => {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`  🚀 BakBak Server running on port ${PORT}`);
      console.log(`  🌍 Environment : ${process.env.NODE_ENV}`);
      console.log(`  💾 Database    : Connected`);
      console.log(`  🔗 URL         : http://localhost:${PORT}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();

// Export io for use in other modules (e.g., controllers)
module.exports = { io };
