import crypto from 'crypto';
import { AuthSession, User } from '../models/UserModel.js';
import { AppError, asyncHandler } from './errorHandler.js';

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) throw new AppError('Please sign in to continue', 401);

  const hashed = hashToken(token);
  const session = await AuthSession.findOne({
    token_hash: hashed,
    expires_at: { $gt: new Date() }
  }).lean();

  if (!session) throw new AppError('Your session has expired. Please sign in again.', 401);

  let user = await User.findById(session.user_id).lean();
  if (!user) {
    user = await User.findOne({ legacy_id: Number(session.user_id) || -1 }).lean();
  }

  if (!user) throw new AppError('User account not found', 401);

  user.id = user._id.toString();
  req.user = user;
  next();
});
