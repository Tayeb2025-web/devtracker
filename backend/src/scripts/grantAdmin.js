import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDatabase } from '../config/database.js';
import { User } from '../models/UserModel.js';

dotenv.config();

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

async function grantAdmin() {
  const userId = option('--user-id');
  const confirmedUsername = option('--confirm-username');
  if (!userId || !confirmedUsername) {
    throw new Error('Use --user-id <MongoDB-user-id> --confirm-username <exact-username> to confirm the intended account.');
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) throw new Error('Provide a valid MongoDB user ID.');

  await connectDatabase();
  try {
    const user = await User.findById(userId).select('_id username role').lean();
    if (!user || user.username !== confirmedUsername) throw new Error('User was not found or the confirmation username did not match.');
    if (user.role !== 'admin') {
      await User.updateOne({ _id: user._id }, { $set: { role: 'admin' } }, { runValidators: true });
    }
    console.log(`Administrator role is active for @${user.username}.`);
  } finally {
    await mongoose.disconnect();
  }
}

grantAdmin().catch(error => {
  console.error(`Administrator setup failed: ${error.message}`);
  process.exitCode = 1;
});
