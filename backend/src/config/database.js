import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Ignore DNS override errors in restricted environments
}

const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://devtracker_user:HQz9dZ2yv7bcVsZl@cluster0.9xfi3bk.mongodb.net/devtracker?retryWrites=true&w=majority&appName=Cluster0';

let cachedPromise = null;

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return true;
  if (cachedPromise) return cachedPromise;

  cachedPromise = mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000,
  }).then(() => {
    console.log('✅ Connected to MongoDB Atlas successfully.');
    cachedPromise = null;
    return true;
  }).catch((error) => {
    cachedPromise = null;
    console.warn(`⚠️ MongoDB connection warning: ${error.message}`);
    return false;
  });

  return cachedPromise;
}

export async function checkDatabaseConnection() {
  if (mongoose.connection.readyState === 1) return true;
  return connectDatabase();
}

export default mongoose;
