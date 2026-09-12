import mongoose from 'mongoose';
import { DEFAULT_USER_ID, XP_PER_HOUR } from '../config/constants.js';
import { formatLocalDate, shiftLocalDate } from '../utils/date.js';

// DailyGoal Schema
const DailyGoalSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  target_hours: { type: Number, default: 10.0 },
  effective_date: { type: String, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
export const DailyGoal = mongoose.models.DailyGoal || mongoose.model('DailyGoal', DailyGoalSchema);

// Streak Schema
const StreakSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true, index: true },
  current_streak: { type: Number, default: 0 },
  longest_streak: { type: Number, default: 0 },
  last_study_date: { type: String, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
export const Streak = mongoose.models.Streak || mongoose.model('Streak', StreakSchema);

// Level Schema
const LevelSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true, index: true },
  current_level: { type: Number, default: 1 },
  current_xp: { type: Number, default: 0 },
  total_xp: { type: Number, default: 0 },
  xp_to_next_level: { type: Number, default: 1000 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
export const Level = mongoose.models.Level || mongoose.model('Level', LevelSchema);

// XpHistory Schema
const XpHistorySchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  session_id: { type: String, default: null },
  xp_amount: { type: Number, required: true },
  source: { type: String, default: 'study' },
  description: { type: String, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
export const XpHistory = mongoose.models.XpHistory || mongoose.model('XpHistory', XpHistorySchema);

// Achievement Schema
const AchievementSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  badge_key: { type: String, required: true },
  badge_name: { type: String, required: true },
  badge_description: { type: String, default: null },
  badge_icon: { type: String, default: 'trophy' },
  unlocked_at: { type: Date, default: Date.now },
}, { timestamps: false });
AchievementSchema.index({ user_id: 1, badge_key: 1 }, { unique: true });
export const Achievement = mongoose.models.Achievement || mongoose.model('Achievement', AchievementSchema);

// Challenge Schema
const ChallengeSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  challenge_key: { type: String, required: true },
  challenge_name: { type: String, required: true },
  challenge_description: { type: String, default: null },
  target_value: { type: Number, required: true },
  current_value: { type: Number, default: 0 },
  unit: { type: String, default: 'days' },
  status: { type: String, enum: ['active', 'completed', 'failed'], default: 'active' },
  started_at: { type: Date, default: Date.now },
  completed_at: { type: Date, default: null },
}, { timestamps: false });
ChallengeSchema.index({ user_id: 1, challenge_key: 1 }, { unique: true });
export const Challenge = mongoose.models.Challenge || mongoose.model('Challenge', ChallengeSchema);

// DailyNote Schema
const DailyNoteSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  note_date: { type: String, required: true },
  content: { type: String, default: null },
  productivity_score: { type: Number, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
DailyNoteSchema.index({ user_id: 1, note_date: 1 }, { unique: true });
export const DailyNote = mongoose.models.DailyNote || mongoose.model('DailyNote', DailyNoteSchema);

export const GoalModel = {
  async get(userId = DEFAULT_USER_ID) {
    const row = await DailyGoal.findOne({
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    }).sort({ created_at: -1 }).lean();
    return row || { target_hours: 10 };
  },

  async update(targetHours, userId = DEFAULT_USER_ID) {
    const updated = await DailyGoal.findOneAndUpdate(
      { $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }] },
      { target_hours: Number(targetHours) },
      { new: true, upsert: true }
    ).lean();
    return updated;
  },
};

export const StreakModel = {
  async get(userId = DEFAULT_USER_ID) {
    const row = await Streak.findOne({
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    }).lean();
    return row || { current_streak: 0, longest_streak: 0 };
  },

  async recalculate(userId = DEFAULT_USER_ID) {
    const { StudySession } = await import('./SessionModel.js');
    const sessions = await StudySession.find({
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    }).sort({ session_date: -1 }).lean();

    const dates = [...new Set(sessions.map(s => s.session_date))];
    const dateSet = new Set(dates);
    let currentStreak = 0;
    let cursor = formatLocalDate();

    if (!dateSet.has(cursor)) cursor = shiftLocalDate(cursor, -1);
    while (dateSet.has(cursor)) {
      currentStreak += 1;
      cursor = shiftLocalDate(cursor, -1);
    }

    const ascendingDates = [...dates].reverse();
    let longestStreak = 0;
    let run = 0;
    let previousDate = null;
    for (const date of ascendingDates) {
      run = previousDate && date === shiftLocalDate(previousDate, 1) ? run + 1 : 1;
      longestStreak = Math.max(longestStreak, run);
      previousDate = date;
    }

    const lastDate = dates[0] || null;

    const streak = await Streak.findOneAndUpdate(
      { $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }] },
      { user_id: String(userId), current_streak: currentStreak, longest_streak: longestStreak, last_study_date: lastDate },
      { new: true, upsert: true }
    ).lean();

    return streak;
  },

  async update(userId = DEFAULT_USER_ID) {
    return this.recalculate(userId);
  },
};

export const LevelModel = {
  async get(userId = DEFAULT_USER_ID) {
    const row = await Level.findOne({
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    }).lean();
    return row || { current_level: 1, current_xp: 0, total_xp: 0, xp_to_next_level: 1000 };
  },

  async addXp(amount, sessionId, userId = DEFAULT_USER_ID) {
    const level = await this.get(userId);
    let totalXp = (level.total_xp || 0) + Number(amount);
    let currentLevel = 1;
    let xpToNext = 1000;
    let remaining = totalXp;

    while (remaining >= xpToNext) {
      remaining -= xpToNext;
      currentLevel++;
      xpToNext = currentLevel * 1000;
    }

    const updated = await Level.findOneAndUpdate(
      { $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }] },
      { current_level: currentLevel, current_xp: remaining, total_xp: totalXp, xp_to_next_level: xpToNext },
      { new: true, upsert: true }
    ).lean();

    await XpHistory.create({
      user_id: String(userId),
      session_id: sessionId ? String(sessionId) : null,
      xp_amount: Number(amount),
      source: 'study',
      description: `Earned ${amount} XP from study session`,
    });

    return updated;
  },

  async recalculate(userId = DEFAULT_USER_ID) {
    const { StudySession } = await import('./SessionModel.js');
    const agg = await StudySession.aggregate([
      { $match: { $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }] } },
      { $group: { _id: null, totalHours: { $sum: '$duration_hours' } } }
    ]);
    const totalHours = agg[0]?.totalHours || 0;
    const totalXp = Math.round(totalHours * XP_PER_HOUR);

    let currentLevel = 1;
    let xpToNext = 1000;
    let currentXp = totalXp;

    while (currentXp >= xpToNext) {
      currentXp -= xpToNext;
      currentLevel += 1;
      xpToNext = currentLevel * 1000;
    }

    const updated = await Level.findOneAndUpdate(
      { $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }] },
      { current_level: currentLevel, current_xp: currentXp, total_xp: totalXp, xp_to_next_level: xpToNext },
      { new: true, upsert: true }
    ).lean();

    return updated;
  },
};

export const AchievementModel = {
  async findAll(userId = DEFAULT_USER_ID) {
    const list = await Achievement.find({
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    }).sort({ unlocked_at: -1 }).lean();
    return list.map(a => ({ ...a, id: a._id.toString() }));
  },

  async unlock(badgeKey, badgeName, description, icon, userId = DEFAULT_USER_ID) {
    try {
      await Achievement.updateOne(
        {
          badge_key: badgeKey,
          $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
        },
        {
          $setOnInsert: {
            user_id: String(userId),
            badge_key: badgeKey,
            badge_name: badgeName,
            badge_description: description,
            badge_icon: icon,
            unlocked_at: new Date(),
          }
        },
        { upsert: true }
      );
    } catch (e) {
      // Ignore duplicate
    }
  },
};

export const ChallengeModel = {
  async findAll(userId = DEFAULT_USER_ID) {
    const list = await Challenge.find({
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    }).sort({ started_at: 1 }).lean();
    return list.map(c => ({ ...c, id: c._id.toString() }));
  },

  async updateProgress(userId = DEFAULT_USER_ID) {
    const { StudySession } = await import('./SessionModel.js');
    const agg = await StudySession.aggregate([
      { $match: { $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }] } },
      { $group: { _id: null, total: { $sum: '$duration_hours' } } }
    ]);
    const hours = Math.floor(agg[0]?.total || 0);

    const streak = await StreakModel.get(userId);

    const updates = [
      { key: '100_hours', value: hours },
      { key: '30_days', value: streak.current_streak || 0 },
      { key: '365_days', value: streak.current_streak || 0 },
    ];

    for (const u of updates) {
      const challenge = await Challenge.findOne({
        challenge_key: u.key,
        $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
      });
      if (challenge) {
        const isCompleted = u.value >= challenge.target_value;
        challenge.current_value = u.value;
        if (isCompleted && challenge.status !== 'completed') {
          challenge.status = 'completed';
          challenge.completed_at = new Date();
        }
        await challenge.save();
      }
    }
  },
};

export const NoteModel = {
  async getByDate(date, userId = DEFAULT_USER_ID) {
    const note = await DailyNote.findOne({
      note_date: date,
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    }).lean();
    return note ? { ...note, id: note._id.toString() } : null;
  },

  async upsert(date, content, productivityScore, userId = DEFAULT_USER_ID) {
    const updated = await DailyNote.findOneAndUpdate(
      {
        note_date: date,
        $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
      },
      {
        content: content ?? null,
        productivity_score: productivityScore ? Number(productivityScore) : null,
      },
      { new: true, upsert: true }
    ).lean();
    return updated ? { ...updated, id: updated._id.toString() } : null;
  },

  async findAll(userId = DEFAULT_USER_ID) {
    const list = await DailyNote.find({
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    }).sort({ note_date: -1 }).lean();
    return list.map(n => ({ ...n, id: n._id.toString() }));
  },
};
