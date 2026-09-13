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
      { user_id: String(userId), target_hours: Number(targetHours) },
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
      {
        user_id: String(userId),
        current_level: currentLevel,
        current_xp: remaining,
        total_xp: totalXp,
        xp_to_next_level: xpToNext,
      },
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
      {
        user_id: String(userId),
        current_level: currentLevel,
        current_xp: currentXp,
        total_xp: totalXp,
        xp_to_next_level: xpToNext,
      },
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

export const DEFAULT_CHALLENGES = [
  {
    challenge_key: '7_days',
    challenge_name: '7 Days Streak',
    challenge_description: 'Study consistently for 7 consecutive days',
    target_value: 7,
    unit: 'days',
  },
  {
    challenge_key: '30_days',
    challenge_name: '30 Days Challenge',
    challenge_description: 'Study every day for 30 consecutive days',
    target_value: 30,
    unit: 'days',
  },
  {
    challenge_key: '50_hours',
    challenge_name: '50 Hours Milestone',
    challenge_description: 'Reach 50 hours of total study time',
    target_value: 50,
    unit: 'hours',
  },
  {
    challenge_key: '100_hours',
    challenge_name: '100 Hours Challenge',
    challenge_description: 'Complete 100 hours of focused study',
    target_value: 100,
    unit: 'hours',
  },
  {
    challenge_key: '250_hours',
    challenge_name: '250 Hours Deep Diver',
    challenge_description: 'Reach 250 hours of total study time',
    target_value: 250,
    unit: 'hours',
  },
  {
    challenge_key: '365_days',
    challenge_name: '365 Days Challenge',
    challenge_description: 'Study every day for a full year',
    target_value: 365,
    unit: 'days',
  },
];

export const ChallengeModel = {
  async ensureDefaults(userId = DEFAULT_USER_ID) {
    for (const def of DEFAULT_CHALLENGES) {
      try {
        await Challenge.updateOne(
          {
            challenge_key: def.challenge_key,
            $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
          },
          {
            $setOnInsert: {
              user_id: String(userId),
              challenge_key: def.challenge_key,
              challenge_name: def.challenge_name,
              challenge_description: def.challenge_description,
              target_value: def.target_value,
              current_value: 0,
              unit: def.unit,
              status: 'active',
              started_at: new Date(),
              completed_at: null,
            }
          },
          { upsert: true }
        );
      } catch (e) {
        // Ignore duplicate key conflict
      }
    }
  },

  async findAll(userId = DEFAULT_USER_ID) {
    await this.ensureDefaults(userId);
    await this.updateProgress(userId);
    const list = await Challenge.find({
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    }).sort({ status: 1, target_value: 1 }).lean();
    return list.map(c => ({ ...c, id: c._id.toString() }));
  },

  async create(userId = DEFAULT_USER_ID, data) {
    const key = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const challenge = await Challenge.create({
      user_id: String(userId),
      challenge_key: key,
      challenge_name: data.challenge_name || 'Custom Challenge',
      challenge_description: data.challenge_description || null,
      target_value: Number(data.target_value) || 10,
      current_value: 0,
      unit: data.unit || 'hours',
      status: 'active',
      started_at: new Date(),
      completed_at: null,
    });
    await this.updateProgress(userId);
    return { ...challenge.toObject(), id: challenge._id.toString() };
  },

  async delete(userId = DEFAULT_USER_ID, id) {
    return Challenge.findOneAndDelete({
      _id: id,
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    });
  },

  async updateProgress(userId = DEFAULT_USER_ID) {
    const { StudySession } = await import('./SessionModel.js');
    const agg = await StudySession.aggregate([
      { $match: { $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }] } },
      { $group: { _id: null, total: { $sum: '$duration_hours' } } }
    ]);
    const totalHours = Math.floor(agg[0]?.total || 0);

    const streak = await StreakModel.get(userId);
    const streakValue = Math.max(streak.current_streak || 0, streak.longest_streak || 0);

    const allChallenges = await Challenge.find({
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    });

    for (const challenge of allChallenges) {
      try {
        let currentValue = challenge.current_value || 0;
        if (challenge.unit === 'hours') {
          currentValue = totalHours;
        } else if (challenge.unit === 'days') {
          currentValue = streakValue;
        }

        const isCompleted = currentValue >= challenge.target_value;
        const updateFields = { current_value: currentValue };
        if (isCompleted && challenge.status !== 'completed') {
          updateFields.status = 'completed';
          updateFields.completed_at = new Date();
        }

        await Challenge.updateOne({ _id: challenge._id }, { $set: updateFields });
      } catch (e) {
        // Continue if single challenge update fails
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
        user_id: String(userId),
        note_date: date,
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
