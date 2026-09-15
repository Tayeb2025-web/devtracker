import mongoose from 'mongoose';
import { DEFAULT_USER_ID } from '../config/constants.js';

export const DEFAULT_AVATARS = [
  '/assets/avatars/cyber-hacker.svg',
  '/assets/avatars/neon-ninja.svg',
  '/assets/avatars/tech-wizard.svg',
  '/assets/avatars/pixel-cat.svg',
  '/assets/avatars/space-astronaut.svg',
  '/assets/avatars/ai-robot.svg',
  '/assets/avatars/dragon-coder.svg',
  '/assets/avatars/falcon-dev.svg',
  '/assets/avatars/coffee-coder.svg',
  '/assets/avatars/ghost-dev.svg',
  '/assets/avatars/samurai-dev.svg',
  '/assets/avatars/cosmic-alien.svg',
  '/assets/avatars/phoenix-hacker.svg',
  '/assets/avatars/viking-coder.svg',
  '/assets/avatars/synthwave-pilot.svg',
  '/assets/avatars/matrix-explorer.svg',
  '/assets/avatars/neon-dev.svg',
  '/assets/avatars/code-panda.svg',
  '/assets/avatars/owl-architect.svg',
  '/assets/avatars/fox-hacker.svg',
];

export function getDeterministicAvatar(seed = '') {
  if (!seed) return DEFAULT_AVATARS[0];
  let hash = 0;
  const str = String(seed).trim().toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[idx];
}

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, sparse: true, trim: true, lowercase: true },
  password_hash: { type: String, default: null },
  display_name: { type: String, default: 'Developer', trim: true },
  avatar_url: { type: String, default: null },
  bio: { type: String, default: null, maxlength: 280 },
  is_profile_public: { type: Boolean, default: true, index: true },
  allow_direct_messages: { type: String, enum: ['everyone', 'followers', 'none'], default: 'followers' },
  theme: { type: String, default: 'dark' },
  calendar_type: { type: String, enum: ['afghan', 'iranian', 'gregorian'], default: 'afghan' },
  notification_enabled: { type: Boolean, default: true },
  notification_time: { type: String, default: '09:00:00' },
  legacy_id: { type: Number, index: true },
  last_seen_at: { type: Date, default: null, index: true },
  is_studying: { type: Boolean, default: false, index: true },
  active_technology: { type: String, default: null },
  today_study_hours: { type: Number, default: 0 },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret.__v; return ret; } },
  toObject: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret.__v; return ret; } },
});

UserSchema.index({ is_profile_public: 1, created_at: -1 });
UserSchema.index({ is_profile_public: 1, last_seen_at: -1 });
UserSchema.index({ display_name: 1 });

UserSchema.virtual('id').get(function () {
  return this._id.toString();
});

export const User = mongoose.models.User || mongoose.model('User', UserSchema);

const AuthSessionSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  token_hash: { type: String, required: true, unique: true, index: true },
  expires_at: { type: Date, required: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false },
});

export const AuthSession = mongoose.models.AuthSession || mongoose.model('AuthSession', AuthSessionSchema);

function normalizeUser(user) {
  if (!user) return null;
  const rawAvatar = user.avatar_url;
  if (!rawAvatar || rawAvatar === '/images/profile.jpg') {
    user.avatar_url = getDeterministicAvatar(user.username || user._id?.toString() || user.id);
  }
  return user;
}

export const UserModel = {
  async findById(id = DEFAULT_USER_ID) {
    if (!id) return null;
    let user;
    if (mongoose.Types.ObjectId.isValid(String(id))) {
      user = await User.findById(id).lean();
    }
    if (!user) {
      user = await User.findOne({ $or: [{ legacy_id: Number(id) || -1 }, { username: String(id) }] }).lean();
    }
    if (!user) {
      user = await User.findOne().sort({ created_at: 1 }).lean();
    }
    if (user) {
      user.id = user._id.toString();
      normalizeUser(user);
    }
    return user;
  },

  async findByEmail(email) {
    if (!email) return null;
    const user = await User.findOne({ email: email.trim().toLowerCase() }).lean();
    if (user) {
      user.id = user._id.toString();
      normalizeUser(user);
    }
    return user;
  },

  async findLegacyUser() {
    const user = await User.findOne({
      $or: [
        { username: 'developer', password_hash: null },
        { email: 'dev@devtracker.local', password_hash: null }
      ]
    }).sort({ created_at: 1 }).lean();
    if (user) {
      user.id = user._id.toString();
      normalizeUser(user);
    }
    return user;
  },

  async claimLegacyUser({ displayName, email, passwordHash, avatarUrl }) {
    const legacyUser = await this.findLegacyUser();
    if (!legacyUser) return null;
    const finalAvatar = avatarUrl || getDeterministicAvatar(email || displayName || legacyUser.username);
    const updated = await User.findByIdAndUpdate(
      legacyUser._id,
      {
        email: email.trim().toLowerCase(),
        display_name: displayName.trim(),
        password_hash: passwordHash,
        avatar_url: finalAvatar,
        last_seen_at: new Date(),
      },
      { new: true }
    ).lean();
    if (updated) {
      updated.id = updated._id.toString();
      normalizeUser(updated);
    }
    return updated;
  },

  async create({ displayName, email, passwordHash, avatarUrl }) {
    const usernamePrefix = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 80) || 'developer';
    const username = `${usernamePrefix}_${Date.now().toString(36)}`;
    const finalAvatar = avatarUrl || getDeterministicAvatar(username);
    const user = await User.create({
      username,
      email: email.trim().toLowerCase(),
      display_name: displayName.trim(),
      password_hash: passwordHash,
      avatar_url: finalAvatar,
      last_seen_at: new Date(),
    });
    const userObj = user.toJSON();
    return normalizeUser(userObj);
  },

  async update(id, data) {
    const allowedFields = [
      'display_name', 'email', 'theme', 'calendar_type', 'notification_enabled', 'notification_time', 'avatar_url',
      'bio', 'is_profile_public', 'allow_direct_messages', 'last_seen_at',
    ];
    const updateData = {};
    allowedFields.forEach(key => {
      if (data[key] !== undefined) updateData[key] = data[key];
    });

    let user;
    if (mongoose.Types.ObjectId.isValid(String(id))) {
      user = await User.findByIdAndUpdate(id, updateData, { new: true }).lean();
    }
    if (!user) {
      user = await User.findOneAndUpdate({ legacy_id: Number(id) || -1 }, updateData, { new: true }).lean();
    }
    if (user) {
      user.id = user._id.toString();
      normalizeUser(user);
    }
    return user;
  },

  async migrateDefaultAvatars() {
    try {
      const usersToUpdate = await User.find({
        $or: [
          { avatar_url: null },
          { avatar_url: '' },
          { avatar_url: '/images/profile.jpg' }
        ]
      }).select('_id username email display_name');

      if (usersToUpdate && usersToUpdate.length > 0) {
        const bulkOps = usersToUpdate.map(u => ({
          updateOne: {
            filter: { _id: u._id },
            update: { $set: { avatar_url: getDeterministicAvatar(u.username || u.email || u._id.toString()) } }
          }
        }));
        await User.bulkWrite(bulkOps);
        console.log(`[UserModel] Migrated ${usersToUpdate.length} users to cool developer avatars.`);
      }

      // Backfill last_seen_at for any users where it is null
      const nullLastSeen = await User.find({ last_seen_at: null }).select('_id created_at');
      if (nullLastSeen && nullLastSeen.length > 0) {
        const lastSeenOps = nullLastSeen.map(u => ({
          updateOne: {
            filter: { _id: u._id },
            update: { $set: { last_seen_at: u.created_at || new Date() } }
          }
        }));
        await User.bulkWrite(lastSeenOps);
        console.log(`[UserModel] Backfilled last_seen_at for ${nullLastSeen.length} users.`);
      }
    } catch (err) {
      console.warn('[UserModel] Migration check skipped or failed:', err.message);
    }
  },
};
