import mongoose from 'mongoose';
import { DEFAULT_USER_ID } from '../config/constants.js';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, sparse: true, trim: true, lowercase: true },
  password_hash: { type: String, default: null },
  display_name: { type: String, default: 'Developer', trim: true },
  avatar_url: { type: String, default: '/images/profile.jpg' },
  bio: { type: String, default: null, maxlength: 280 },
  is_profile_public: { type: Boolean, default: true },
  allow_direct_messages: { type: String, enum: ['everyone', 'followers', 'none'], default: 'followers' },
  theme: { type: String, default: 'dark' },
  calendar_type: { type: String, enum: ['afghan', 'iranian', 'gregorian'], default: 'afghan' },
  notification_enabled: { type: Boolean, default: true },
  notification_time: { type: String, default: '09:00:00' },
  legacy_id: { type: Number, index: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret.__v; return ret; } },
  toObject: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret.__v; return ret; } },
});

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
    }
    return user;
  },

  async findByEmail(email) {
    if (!email) return null;
    const user = await User.findOne({ email: email.trim().toLowerCase() }).lean();
    if (user) user.id = user._id.toString();
    return user;
  },

  async findLegacyUser() {
    const user = await User.findOne({
      $or: [
        { username: 'developer', password_hash: null },
        { email: 'dev@devtracker.local', password_hash: null }
      ]
    }).sort({ created_at: 1 }).lean();
    if (user) user.id = user._id.toString();
    return user;
  },

  async claimLegacyUser({ displayName, email, passwordHash }) {
    const legacyUser = await this.findLegacyUser();
    if (!legacyUser) return null;
    const updated = await User.findByIdAndUpdate(
      legacyUser._id,
      {
        email: email.trim().toLowerCase(),
        display_name: displayName.trim(),
        password_hash: passwordHash,
        avatar_url: '/images/profile.jpg',
      },
      { new: true }
    ).lean();
    if (updated) updated.id = updated._id.toString();
    return updated;
  },

  async create({ displayName, email, passwordHash }) {
    const usernamePrefix = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 80) || 'developer';
    const username = `${usernamePrefix}_${Date.now().toString(36)}`;
    const user = await User.create({
      username,
      email: email.trim().toLowerCase(),
      display_name: displayName.trim(),
      password_hash: passwordHash,
      avatar_url: '/images/profile.jpg',
    });
    const userObj = user.toJSON();
    return userObj;
  },

  async update(id, data) {
    const allowedFields = [
      'display_name', 'email', 'theme', 'calendar_type', 'notification_enabled', 'notification_time', 'avatar_url',
      'bio', 'is_profile_public', 'allow_direct_messages',
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
    if (user) user.id = user._id.toString();
    return user;
  },
};
