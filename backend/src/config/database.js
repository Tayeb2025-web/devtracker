import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const cached = global._mongooseConn || (global._mongooseConn = { conn: null, promise: null });

mongoose.connection.on('disconnected', () => {
  cached.conn = null;
  cached.promise = null;
});

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return true;
  if (!MONGODB_URI) throw new Error('MONGODB_URI is required before the API can access data.');

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      maxPoolSize: 20,
    }).then((connection) => {
      cached.conn = connection;
      console.log('Connected to MongoDB.');
      return true;
    }).catch((error) => {
      cached.promise = null;
      throw error;
    });
  }
  return cached.promise;
}

export async function checkDatabaseConnection() {
  return mongoose.connection.readyState === 1 || connectDatabase();
}

export default mongoose;
