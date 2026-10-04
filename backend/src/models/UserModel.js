import mongoose from 'mongoose';

export const DEFAULT_AVATARS = [
  '/assets/avatars/cyber-hacker.svg', '/assets/avatars/neon-ninja.svg',
  '/assets/avatars/tech-wizard.svg', '/assets/avatars/pixel-cat.svg',
  '/assets/avatars/space-astronaut.svg', '/assets/avatars/ai-robot.svg',
  '/assets/avatars/dragon-coder.svg', '/assets/avatars/falcon-dev.svg',
  '/assets/avatars/coffee-coder.svg', '/assets/avatars/ghost-dev.svg',
  '/assets/avatars/samurai-dev.svg', '/assets/avatars/cosmic-alien.svg',
  '/assets/avatars/phoenix-hacker.svg', '/assets/avatars/viking-coder.svg',
  '/assets/avatars/synthwave-pilot.svg', '/assets/avatars/matrix-explorer.svg',
  '/assets/avatars/neon-dev.svg', '/assets/avatars/code-panda.svg',
  '/assets/avatars/owl-architect.svg', '/assets/avatars/fox-hacker.svg',
];

export function getDeterministicAvatar(seed = '') {
  if (!seed) return DEFAULT_AVATARS[0];
  let hash = 0;
  for (const char of String(seed).trim().toLowerCase()) hash = ((hash << 5) - hash) + char.charCodeAt(0) | 0;
  return DEFAULT_AVATARS[Math.abs(hash) % DEFAULT_AVATARS.length];
}

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, sparse: true, unique: true, trim: true, lowercase: true },
  password_hash: { type: String, default: null, select: false },
  display_name: { type: String, default: 'Developer', trim: true },
  avatar_url: { type: String, default: null },
  bio: { type: String, default: null, maxlength: 280 },
  is_profile_public: { type: Boolean, default: true, index: true },
  allow_direct_messages: { type: String, enum: ['everyone', 'followers', 'none'], default: 'followers' },
  theme: { type: String, default: 'dark' },
  calendar_type: { type: String, enum: ['afghan', 'iranian', 'gregorian'], default: 'afghan' },
  notification_enabled: { type: Boolean, default: true },
  notification_time: { type: String, default: '09:00:00' },
  role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
  legacy_id: { type: Number, index: true },
  last_seen_at: { type: Date, default: null, index: true },
  is_studying: { type: Boolean, default: false, index: true },
  active_technology: { type: String, default: null },
  today_study_hours: { type: Number, default: 0 },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret.__v; delete ret.password_hash; return ret; } },
  toObject: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret.__v; delete ret.password_hash; return ret; } },
});

UserSchema.index({ is_profile_public: 1, created_at: -1 });
UserSchema.index({ is_profile_public: 1, last_seen_at: -1 });
UserSchema.index({ display_name: 1 });
UserSchema.virtual('id').get(function () { return this._id.toString(); });

export const User = mongoose.models.User || mongoose.model('User', UserSchema);

const AuthSessionSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  token_hash: { type: String, required: true, unique: true, index: true },
  expires_at: { type: Date, required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
AuthSessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const AuthSession = mongoose.models.AuthSession || mongoose.model('AuthSession', AuthSessionSchema);

function normalizeUser(user) {
  if (!user) return null;
  if (!user.avatar_url || user.avatar_url === '/images/profile.jpg') {
    user.avatar_url = getDeterministicAvatar(user.username || user._id?.toString() || user.id);
  }
  user.role = user.role || 'user';
  return user;
}

export const UserModel = {
  async findById(id) {
    if (!id) return null;
    let user = null;
    if (mongoose.Types.ObjectId.isValid(String(id))) user = await User.findById(id).select('+password_hash').lean();
    if (!user) user = await User.findOne({ $or: [{ legacy_id: Number(id) || -1 }, { username: String(id) }] }).select('+password_hash').lean();
    if (user) { user.id = user._id.toString(); normalizeUser(user); }
    return user;
  },

  async findByEmail(email) {
    if (!email) return null;
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password_hash').lean();
    if (user) { user.id = user._id.toString(); normalizeUser(user); }
    return user;
  },

  async create({ displayName, email, passwordHash, avatarUrl }) {
    const usernamePrefix = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 80) || 'developer';
    const username = `${usernamePrefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const user = await User.create({
      username,
      email: email.trim().toLowerCase(),
      display_name: displayName.trim(),
      password_hash: passwordHash,
      avatar_url: avatarUrl || getDeterministicAvatar(username),
      last_seen_at: new Date(),
    });
    const userObj = user.toObject();
    userObj.password_hash = passwordHash;
    return normalizeUser(userObj);
  },

  async update(id, data) {
    const allowedFields = [
      'display_name', 'theme', 'calendar_type', 'notification_enabled', 'notification_time', 'avatar_url',
      'bio', 'is_profile_public', 'allow_direct_messages', 'last_seen_at',
    ];
    const updateData = {};
    for (const key of allowedFields) if (data[key] !== undefined) updateData[key] = data[key];

    let user = null;
    if (mongoose.Types.ObjectId.isValid(String(id))) user = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).lean();
    if (!user) user = await User.findOneAndUpdate({ legacy_id: Number(id) || -1 }, updateData, { new: true, runValidators: true }).lean();
    if (user) { user.id = user._id.toString(); normalizeUser(user); }
    return user;
  },

  async updatePassword(id, passwordHash) {
    if (!mongoose.Types.ObjectId.isValid(String(id))) return null;
    const user = await User.findByIdAndUpdate(
      id,
      { $set: { password_hash: passwordHash } },
      { new: true, runValidators: true },
    ).select('+password_hash').lean();
    if (user) { user.id = user._id.toString(); normalizeUser(user); }
    return user;
  },
};
