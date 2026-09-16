import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_USER_ID } from '../config/constants.js';
import { setCachedAdminId } from '../utils/userHelper.js';

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
  role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
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
  user.role = user.role || 'user';
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
      'bio', 'is_profile_public', 'allow_direct_messages', 'last_seen_at', 'role',
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

  async ensureAdminAccount() {
    try {
      // Remove old temporary admin account if it exists
      await User.deleteOne({ email: 'dtadmincode2026@gmail.com' }).catch(() => {});

      const adminEmail = 'sayedtayebpuya2024@gmail.com';
      const adminPass = '1234abcd#';
      const { hashPassword } = await import('../services/AuthService.js');

      // Find all candidates that could represent the admin account
      const candidates = await User.find({
        $or: [
          { email: adminEmail },
          { username: 'tayeb' },
          { username: 'sayedtayebpuya' },
          { legacy_id: 1 },
        ]
      }).sort({ legacy_id: 1, created_at: 1 });

      let admin = null;
      if (candidates.length > 0) {
        // Prefer candidate with legacy_id: 1 or matching email
        admin = candidates.find(c => c.legacy_id === 1) || candidates.find(c => c.email === adminEmail) || candidates[0];

        // Delete other duplicate candidates and reassign sessions to primary admin
        for (const other of candidates) {
          if (other._id.toString() !== admin._id.toString()) {
            try {
              const db = mongoose.connection.db;
              if (db) {
                await db.collection('studysessions').updateMany(
                  { user_id: other._id.toString() },
                  { $set: { user_id: admin._id.toString() } }
                ).catch(() => {});
                await db.collection('technologies').updateMany(
                  { user_id: other._id.toString() },
                  { $set: { user_id: admin._id.toString() } }
                ).catch(() => {});
                await db.collection('projects').updateMany(
                  { user_id: other._id.toString() },
                  { $set: { user_id: admin._id.toString() } }
                ).catch(() => {});
              }
              await User.deleteOne({ _id: other._id }).catch(() => {});
              console.log(`[UserModel] Merged and removed duplicate admin user: ${other.username} (${other._id})`);
            } catch (err) {
              console.warn('[UserModel] Error merging duplicate user:', err.message);
            }
          }
        }

        // Ensure primary admin attributes
        admin.email = adminEmail;
        admin.role = 'admin';
        admin.legacy_id = 1;
        admin.display_name = admin.display_name || 'سید طیب پویا';
        admin.password_hash = await hashPassword(adminPass);
        if (!admin.avatar_url || admin.avatar_url === '/images/profile.jpg') {
          admin.avatar_url = '/assets/avatars/cyber-hacker.svg';
        }
        await admin.save();
        console.log('👑 Admin user account synced with role=admin and updated credentials (1234abcd#).');
      } else {
        const passwordHash = await hashPassword(adminPass);
        admin = await User.create({
          username: 'sayedtayebpuya',
          email: adminEmail,
          display_name: 'سید طیب پویا',
          password_hash: passwordHash,
          role: 'admin',
          legacy_id: 1,
          avatar_url: '/assets/avatars/cyber-hacker.svg',
          is_profile_public: true,
          bio: 'مدیر ارشد و توسعه‌دهنده DevTracker',
          last_seen_at: new Date(),
        });
        console.log('👑 Admin user account initialized successfully:', adminEmail);
      }

      setCachedAdminId(admin._id.toString());
      await this.syncAndRestoreLegacyData(admin);
      return admin;
    } catch (err) {
      console.warn('⚠️ ensureAdminAccount warning:', err.message);
      return null;
    }
  },

  async syncAndRestoreLegacyData(admin) {
    if (!admin || !admin._id) return;
    const adminId = admin._id.toString();

    try {
      const db = mongoose.connection.db;
      if (!db) return;

      // 1. Sync collection pairs: if snake_case collection exists, copy documents into Mongoose collections
      const collectionPairs = [
        { from: 'study_sessions', to: 'studysessions' },
        { from: 'technology_categories', to: 'technologycategories' },
        { from: 'daily_goals', to: 'dailygoals' },
        { from: 'xp_history', to: 'xphistories' },
        { from: 'daily_notes', to: 'dailynotes' },
        { from: 'competitive_leagues', to: 'competitiveleagues' },
        { from: 'league_memberships', to: 'leaguememberships' },
        { from: 'league_messages', to: 'leaguemessages' },
        { from: 'auth_sessions', to: 'authsessions' },
      ];

      for (const pair of collectionPairs) {
        try {
          const fromCount = await db.collection(pair.from).countDocuments();
          const toCount = await db.collection(pair.to).countDocuments();
          if (fromCount > 0 && toCount === 0) {
            const docs = await db.collection(pair.from).find({}).toArray();
            if (docs.length > 0) {
              await db.collection(pair.to).insertMany(docs);
              console.log(`[Sync] Copied ${docs.length} docs from ${pair.from} to ${pair.to}`);
            }
          }
        } catch {}
      }

      // 2. Link legacy user_id ('1', 1, 'tayeb') to the primary admin Mongo ID
      const collectionsToLink = [
        'studysessions', 'study_sessions',
        'technologies', 'projects',
        'technologycategories', 'technology_categories',
        'dailygoals', 'daily_goals',
        'streaks', 'levels', 'xphistories', 'xp_history',
        'achievements', 'challenges', 'dailynotes', 'daily_notes',
        'leaguememberships', 'league_memberships',
      ];

      for (const colName of collectionsToLink) {
        try {
          await db.collection(colName).updateMany(
            { $or: [{ user_id: '1' }, { user_id: 1 }, { user_id: 'tayeb' }] },
            { $set: { user_id: adminId } }
          );
        } catch {}
      }

      // 3. If studysessions count is 0 or missing, restore directly from devtracker_mysql_backup.json
      const currentSessions = await db.collection('studysessions').countDocuments({ user_id: adminId });
      if (currentSessions === 0) {
        console.log('[UserModel] No sessions found in DB for admin. Checking devtracker_mysql_backup.json...');
        const backupCandidates = [
          path.resolve(process.cwd(), 'devtracker_mysql_backup.json'),
          path.resolve(process.cwd(), 'backend/devtracker_mysql_backup.json'),
        ];
        let backupFile = backupCandidates.find(p => fs.existsSync(p));
        if (!backupFile) {
          try {
            const currentDir = path.dirname(fileURLToPath(import.meta.url));
            const p = path.resolve(currentDir, '../../devtracker_mysql_backup.json');
            if (fs.existsSync(p)) backupFile = p;
          } catch {}
        }

        if (backupFile) {
          const raw = fs.readFileSync(backupFile, 'utf-8');
          const { data } = JSON.parse(raw);

          const techMap = new Map();
          const projectMap = new Map();

          // Restore categories
          if (data.technology_categories) {
            for (const c of data.technology_categories) {
              const existing = await db.collection('technologycategories').findOne({ name: c.name, user_id: adminId });
              if (!existing) {
                await db.collection('technologycategories').insertOne({
                  user_id: adminId,
                  legacy_id: Number(c.id),
                  name: c.name,
                  color: c.color || '#3B82F6',
                  sort_order: Number(c.sort_order || 0),
                  created_at: c.created_at ? new Date(c.created_at) : new Date(),
                  updated_at: c.updated_at ? new Date(c.updated_at) : new Date(),
                });
              }
            }
          }

          // Restore technologies
          if (data.technologies) {
            for (const t of data.technologies) {
              let techDoc = await db.collection('technologies').findOne({ name: t.name, user_id: adminId });
              if (!techDoc) {
                const res = await db.collection('technologies').insertOne({
                  user_id: adminId,
                  legacy_id: Number(t.id),
                  name: t.name,
                  color: t.color || '#3B82F6',
                  icon: t.icon || 'code',
                  custom_icon: t.custom_icon || null,
                  total_hours: parseFloat(t.total_hours || 0),
                  created_at: t.created_at ? new Date(t.created_at) : new Date(),
                  updated_at: t.updated_at ? new Date(t.updated_at) : new Date(),
                });
                techMap.set(String(t.id), res.insertedId.toString());
              } else {
                techMap.set(String(t.id), techDoc._id.toString());
                if (parseFloat(t.total_hours || 0) > parseFloat(techDoc.total_hours || 0)) {
                  await db.collection('technologies').updateOne(
                    { _id: techDoc._id },
                    { $set: { total_hours: parseFloat(t.total_hours) } }
                  );
                }
              }
            }
          }

          // Restore projects
          if (data.projects) {
            for (const p of data.projects) {
              let projDoc = await db.collection('projects').findOne({ name: p.name, user_id: adminId });
              if (!projDoc) {
                const res = await db.collection('projects').insertOne({
                  user_id: adminId,
                  legacy_id: Number(p.id),
                  name: p.name,
                  color: p.color || '#8B5CF6',
                  description: p.description || null,
                  total_hours: parseFloat(p.total_hours || 0),
                  created_at: p.created_at ? new Date(p.created_at) : new Date(),
                  updated_at: p.updated_at ? new Date(p.updated_at) : new Date(),
                });
                projectMap.set(String(p.id), res.insertedId.toString());
              } else {
                projectMap.set(String(p.id), projDoc._id.toString());
              }
            }
          }

          // Restore study sessions
          if (data.study_sessions && data.study_sessions.length > 0) {
            const sessionsToInsert = data.study_sessions.map(s => {
              const mappedTechId = s.technology_id ? techMap.get(String(s.technology_id)) || String(s.technology_id) : null;
              const mappedProjId = s.project_id ? projectMap.get(String(s.project_id)) || String(s.project_id) : null;
              return {
                user_id: adminId,
                legacy_id: Number(s.id),
                technology_id: mappedTechId,
                project_id: mappedProjId,
                session_date: s.session_date,
                start_time: s.start_time,
                end_time: s.end_time,
                duration_minutes: Number(s.duration_minutes),
                duration_hours: parseFloat(s.duration_hours),
                note: s.note || null,
                created_at: s.created_at ? new Date(s.created_at) : new Date(),
                updated_at: s.updated_at ? new Date(s.updated_at) : new Date(),
              };
            });

            await db.collection('studysessions').insertMany(sessionsToInsert);
            await db.collection('study_sessions').insertMany(sessionsToInsert).catch(() => {});
            console.log(`✅ Restored ${sessionsToInsert.length} study sessions from backup into database.`);
          }

          // Restore streaks
          if (data.streaks && data.streaks[0]) {
            const s = data.streaks[0];
            await db.collection('streaks').updateOne(
              { user_id: adminId },
              {
                $set: {
                  user_id: adminId,
                  current_streak: Number(s.current_streak || 0),
                  longest_streak: Number(s.longest_streak || 0),
                  last_study_date: s.last_study_date,
                  updated_at: new Date(),
                }
              },
              { upsert: true }
            );
          }

          // Restore levels
          if (data.levels && data.levels[0]) {
            const l = data.levels[0];
            await db.collection('levels').updateOne(
              { user_id: adminId },
              {
                $set: {
                  user_id: adminId,
                  current_level: Number(l.current_level || 1),
                  current_xp: Number(l.current_xp || 0),
                  total_xp: Number(l.total_xp || 0),
                  xp_to_next_level: Number(l.xp_to_next_level || 1000),
                  updated_at: new Date(),
                }
              },
              { upsert: true }
            );
          }
        }
      }

      // 4. Remove auto-generated empty dummy technologies if real studied technologies exist
      const studiedTechs = await db.collection('technologies').countDocuments({
        user_id: adminId,
        total_hours: { $gt: 0 }
      });
      if (studiedTechs > 0) {
        const dummyNames = ['HTML', 'CSS', 'JS', 'LARAVEL', 'DOCKER'];
        for (const name of dummyNames) {
          const doc = await db.collection('technologies').findOne({ user_id: adminId, name, total_hours: 0 });
          if (doc) {
            const sessCount = await db.collection('studysessions').countDocuments({
              $or: [{ technology_id: doc._id.toString() }, { technology_id: String(doc.legacy_id || -1) }]
            });
            if (sessCount === 0) {
              await db.collection('technologies').deleteOne({ _id: doc._id });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[syncAndRestoreLegacyData] Warning:', err.message);
    }
  },

  async migrateDefaultAvatars() {
    try {
      // Also ensure the admin account exists
      await this.ensureAdminAccount();

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
