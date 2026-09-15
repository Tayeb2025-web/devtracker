import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

// Only override DNS servers in local development environments, never on Vercel / serverless
if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch (e) {
    // Ignore DNS override errors in restricted environments
  }
}

const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://devtracker_user:HQz9dZ2yv7bcVsZl@cluster0.9xfi3bk.mongodb.net/devtracker?retryWrites=true&w=majority&appName=Cluster0';

let cached = global._mongooseConn;
if (!cached) {
  cached = global._mongooseConn = { conn: null, promise: null };
}

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return true;
  if (cached.conn) return true;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      maxPoolSize: 20,
    }).then((m) => {
      console.log('✅ Connected to MongoDB Atlas successfully.');
      cached.conn = m;
      if (!global._hasRanAvatarMigration) {
        global._hasRanAvatarMigration = true;
        import('../models/UserModel.js').then(({ UserModel }) => {
          UserModel.migrateDefaultAvatars().catch(() => {});
        }).catch(() => {});
      }
      return true;
    }).catch((error) => {
      cached.promise = null;
      console.warn(`⚠️ MongoDB connection warning: ${error.message}`);
      return false;
    });
  }

  return cached.promise;
}

export async function checkDatabaseConnection() {
  if (mongoose.connection.readyState === 1) return true;
  return connectDatabase();
}

export default mongoose;
