import mongoose from 'mongoose';

let cachedAdminId = null;

export function setCachedAdminId(id) {
  if (id) cachedAdminId = String(id);
}

export function getCachedAdminId() {
  return cachedAdminId;
}

/**
 * Resolves all identifier strings for a given userId to ensure
 * queries match across legacy IDs, MongoDB ObjectIds, and usernames.
 * Specifically for the admin user (user 1 / sayedtayebpuya2024@gmail.com),
 * it returns both '1' and their MongoDB _id.
 */
export async function getTargetUserIds(userId) {
  const strId = String(userId || '').trim();
  const ids = new Set();
  if (strId) ids.add(strId);
  const num = Number(strId);
  if (!isNaN(num) && num > 0) ids.add(String(num));

  // If this is user 1 or known admin ID
  if (strId === '1' || num === 1 || (cachedAdminId && cachedAdminId === strId)) {
    ids.add('1');
    ids.add('tayeb');
    ids.add('sayedtayebpuya');
    if (cachedAdminId) ids.add(cachedAdminId);
    return Array.from(ids);
  }

  try {
    const { User } = await import('../models/UserModel.js');
    if (mongoose.Types.ObjectId.isValid(strId)) {
      const user = await User.findById(strId).select('legacy_id email role username').lean();
      if (user) {
        if (user.legacy_id) ids.add(String(user.legacy_id));
        if (user.legacy_id === 1 || user.email === 'sayedtayebpuya2024@gmail.com' || user.role === 'admin') {
          cachedAdminId = strId;
          ids.add('1');
          ids.add('tayeb');
          ids.add('sayedtayebpuya');
        }
      }
    }
  } catch {
    // Non-blocking fallback
  }

  return Array.from(ids);
}

/**
 * Returns a MongoDB query object matching any of the user's possible IDs.
 */
export async function getUserFilter(userId) {
  const ids = await getTargetUserIds(userId);
  return { user_id: { $in: ids } };
}
