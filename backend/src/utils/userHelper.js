import mongoose from 'mongoose';
import { resolveOwnedUserIds } from './domainRules.js';

/** Return only identifiers that resolve to this exact account. */
export async function getTargetUserIds(userId) {
  const id = String(userId ?? '').trim();
  if (!id) throw new Error('Authenticated user identity is required for data access.');

  const { User } = await import('../models/UserModel.js');
  let user = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    user = await User.findById(id).select('_id legacy_id username').lean();
  }
  if (!user) {
    user = await User.findOne({ $or: [{ legacy_id: Number(id) || -1 }, { username: id }] })
      .select('_id legacy_id username').lean();
  }
  return resolveOwnedUserIds(id, user);
}

export async function getUserFilter(userId) {
  return { user_id: { $in: await getTargetUserIds(userId) } };
}
