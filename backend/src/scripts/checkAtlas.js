import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkMongo() {
  if (!MONGODB_URI) throw new Error('Set MONGODB_URI before checking the database.');
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

  await mongoose.disconnect();
}

checkMongo().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
