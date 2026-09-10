import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

const MONGODB_URI = process.env.MONGODB_URI;

async function checkMongo() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('Collections in Atlas:', collections.map(c => c.name));

  for (const c of collections) {
    const count = await db.collection(c.name).countDocuments();
    console.log(`Collection ${c.name}: ${count} documents`);
  }

  const users = await db.collection('users').find().toArray();
  console.log('Users in Mongo Atlas:');
  console.log(JSON.stringify(users, null, 2));

  await mongoose.disconnect();
}

checkMongo().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
