import crypto from 'crypto';
import { AuthSession, UserModel } from '../models/UserModel.js';
import { AppError } from '../middlewares/errorHandler.js';
import { hashToken } from '../middlewares/auth.js';

export const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => new Promise((resolve, reject) => {
  crypto.scrypt(password, salt, 64, (error, derivedKey) => {
    if (error) reject(error);
    else resolve(`${salt}:${derivedKey.toString('hex')}`);
  });
});

export const verifyPassword = async (password, stored) => {
  const [salt, savedHash] = String(stored || '').split(':');
  if (!salt || !/^[\da-f]{128}$/i.test(savedHash || '')) return false;
  const comparison = await hashPassword(password, salt);
  const actual = Buffer.from(comparison.split(':')[1], 'hex');
  const expected = Buffer.from(savedHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};

const publicUser = ({ password_hash, ...user }) => ({
  ...user,
  role: user.role || 'user',
});

async function createSession(user) {
  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await AuthSession.create({
    user_id: user.id,
    token_hash: hashToken(token),
    expires_at: expiresAt,
  });
  return { token, user: publicUser(user) };
}

export const AuthService = {
  async register({ displayName, email, password }) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await UserModel.findByEmail(normalizedEmail);
    if (existing) throw new AppError('An account with this email already exists', 409);
    const passwordHash = await hashPassword(password);
    const user = await UserModel.create({ displayName: displayName.trim(), email: normalizedEmail, passwordHash });

    try {
      const { TechnologyModel } = await import('../models/TechnologyModel.js');
      const { ChallengeModel } = await import('../models/GoalModel.js');
      const userId = user.id || user._id;
      await Promise.all([
        TechnologyModel.ensureDefaults(userId),
        ChallengeModel.ensureDefaults(userId),
      ]);
    } catch (err) {
      console.error('Failed to seed defaults on user registration:', err);
    }

    return createSession(user);
  },

  async login({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await UserModel.findByEmail(normalizedEmail);
    if (!user || !await verifyPassword(password, user.password_hash)) throw new AppError('Email or password is incorrect', 401);
    const userId = user.id || user._id;
    await UserModel.update(userId, { last_seen_at: new Date() }).catch(() => {});
    user.last_seen_at = new Date();
    return createSession(user);
  },

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await UserModel.findById(userId);
    if (!user || !await verifyPassword(currentPassword, user.password_hash)) {
      throw new AppError('Current password is incorrect', 400);
    }
    if (currentPassword === newPassword) throw new AppError('Choose a password you have not used before', 400);

    const passwordHash = await hashPassword(newPassword);
    const updated = await UserModel.updatePassword(user.id, passwordHash);
    if (!updated) throw new AppError('User account not found', 404);

    const ownerIds = [updated.id, updated._id?.toString(), updated.username, updated.legacy_id]
      .filter(value => value !== undefined && value !== null)
      .map(String);
    await AuthSession.deleteMany({ user_id: { $in: ownerIds } });
    return createSession(updated);
  },

  async logout(token) {
    if (token) await AuthSession.deleteOne({ token_hash: hashToken(token) });
  },
};
