// ============================================================
// BakBak Chat - MongoDB Atlas Connection
// File: backend/src/config/db.js
// Uses direct replica-set connection string (not SRV) to avoid
// DNS-based SRV resolution issues and port conflicts.
// ============================================================

const mongoose = require('mongoose');

const connectDB = async () => {
  let uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in your .env file!');
    process.exit(1);
  }

  // ── URL-encode special characters in the password ──────────
  // The '#' character in passwords breaks URI parsing.
  // We detect it and encode only the password segment automatically.
  if (uri.includes('#') && !uri.includes('%23')) {
    // Extract and encode just the password part
    // Pattern: mongodb://user:PASS@host  or  mongodb+srv://user:PASS@host
    uri = uri.replace(
      /^(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)$/,
      (_, prefix, password, suffix) => {
        return prefix + encodeURIComponent(password) + suffix;
      }
    );
    console.log('ℹ️  Special characters in password were URL-encoded automatically.');
  }

  try {
    const conn = await mongoose.connect(uri, {
      // ── Replica Set / Atlas options ──────────────────────
      serverSelectionTimeoutMS: 10000,  // 10s to find a primary
      socketTimeoutMS: 45000,           // Close idle sockets after 45s
      connectTimeoutMS: 10000,          // TCP connection timeout
      maxPoolSize: 10,                  // Max concurrent connections
      retryWrites: true,
      w: 'majority',
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // ── Runtime connection event listeners ────────────────
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully.');
    });
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB runtime error:', err.message);
    });

  } catch (error) {
    console.error('\n❌ MongoDB Connection Failed:', error.message);
    console.error('\n📋 Troubleshooting Checklist:');
    console.error('   1. Is MONGODB_URI set correctly in backend/.env?');
    console.error('   2. Is your IP whitelisted in MongoDB Atlas → Network Access?');
    console.error('      → For dev: add 0.0.0.0/0 (allow from anywhere)');
    console.error('   3. Is your username/password correct?');
    console.error('   4. Does the password contain special chars like # @ : ?');
    console.error('      → If yes, URL-encode them: # → %23, @ → %40, : → %3A\n');
    process.exit(1);
  }
};

module.exports = connectDB;
