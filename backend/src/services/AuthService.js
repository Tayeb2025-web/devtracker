import crypto from 'crypto';
import { AuthSession, UserModel } from '../models/UserModel.js';
import { AppError } from '../middlewares/errorHandler.js';
import { hashToken } from '../middlewares/auth.js';

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => new Promise((resolve, reject) => {
  crypto.scrypt(password, salt, 64, (error, derivedKey) => {
    if (error) reject(error);
    else resolve(`${salt}:${derivedKey.toString('hex')}`);
  });
});

const verifyPassword = async (password, stored) => {
  const [salt, savedHash] = String(stored || '').split(':');
  if (!salt || !savedHash) return false;
  const comparison = await hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(comparison), Buffer.from(stored));
};

const publicUser = ({ password_hash, ...user }) => user;

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
    if (existing?.password_hash) throw new AppError('An account with this email already exists', 409);
    const passwordHash = await hashPassword(password);
    // Claim legacy account if present, otherwise create new
    const user = await UserModel.claimLegacyUser({ displayName: displayName.trim(), email: normalizedEmail, passwordHash })
      || await UserModel.create({ displayName: displayName.trim(), email: normalizedEmail, passwordHash });

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
    const user = await UserModel.findByEmail(email.trim().toLowerCase());
    if (!user || !await verifyPassword(password, user.password_hash)) throw new AppError('Email or password is incorrect', 401);
    return createSession(user);
  },

  async logout(token) {
    if (token) await AuthSession.deleteOne({ token_hash: hashToken(token) });
  },
};
