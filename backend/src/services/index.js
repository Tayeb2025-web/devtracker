import { createHash } from 'node:crypto';
import { SessionModel } from '../models/SessionModel.js';
import { StudySession } from '../models/SessionModel.js';
import { Technology, TechnologyModel } from '../models/TechnologyModel.js';
import { Project, ProjectModel } from '../models/ProjectModel.js';
import { CategoryModel, TechnologyCategory } from '../models/CategoryModel.js';
import { Challenge, DailyNote, GoalModel, StreakModel, LevelModel, AchievementModel, ChallengeModel, NoteModel } from '../models/GoalModel.js';
import { UserModel, getDeterministicAvatar } from '../models/UserModel.js';
import { XP_PER_HOUR, ACHIEVEMENTS, MOTIVATIONAL_QUOTES, DEFAULT_USER_ID } from '../config/constants.js';
import { AppError } from '../middlewares/errorHandler.js';
import { afghanToGregorianDate, formatAfghanDate, formatAfghanNumericDate, formatLocalDate, getCalendarYearRange, getCalendarYearStart, shiftLocalDate } from '../utils/date.js';
import { uploadAvatarBuffer } from '../config/cloudinary.js';
import { getTargetUserIds } from '../utils/userHelper.js';
import { inferTechnologyKey } from '../models/TechnologyModel.js';

export const SessionService = {
  async createSession(data, userId = DEFAULT_USER_ID) {
    const durationMinutes = Number(data.duration_minutes);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 720) {
      throw new AppError('Duration must be between 1 minute and 12 hours', 400);
    }
    if (data.kind && data.kind !== 'focus') throw new AppError('Only focus sessions can be recorded as study time', 400);
    const normalizedData = {
      ...data,
      technology_id: data.technology_id ? String(data.technology_id) : null,
      project_id: data.project_id ? String(data.project_id) : null,
      duration_minutes: durationMinutes,
      duration_hours: Number((durationMinutes / 60).toFixed(4)),
      source: ['timer', 'manual'].includes(data.source) ? data.source : 'manual',
      kind: 'focus',
    };
    if (!normalizedData.technology_id && !normalizedData.project_id) {
      throw new AppError('Select a technology or a project', 400);
    }
    let technologySnapshot = null;
    let projectSnapshot = null;
    if (normalizedData.technology_id) {
      const tech = await TechnologyModel.findById(normalizedData.technology_id, userId);
      if (!tech) throw new AppError('Technology not found', 404);
      technologySnapshot = { name: tech.name, color: tech.color };
    }
    if (normalizedData.project_id) {
      const project = await ProjectModel.findById(normalizedData.project_id, userId);
      if (!project) throw new AppError('Project not found', 404);
      projectSnapshot = { name: project.name, color: project.color };
    }

    normalizedData.technology_name = technologySnapshot?.name || null;
    normalizedData.technology_color = technologySnapshot?.color || null;
    normalizedData.project_name = projectSnapshot?.name || null;
    normalizedData.project_color = projectSnapshot?.color || null;

    const session = await SessionModel.create(normalizedData, userId);
    const wasAlreadySaved = Boolean(session.alreadyExisted);
    delete session.alreadyExisted;

    // These projections are rebuilt from sessions, so retries repair partial failures
    // without incrementing totals twice.
    await Promise.all([
      TechnologyModel.recalculateHours(userId),
      ProjectModel.recalculateHours(userId),
      StreakModel.recalculate(userId),
    ]);

    const xpAmount = Math.round((durationMinutes / 60) * XP_PER_HOUR);
    const level = await LevelModel.addXp(xpAmount, session.id, userId);
    await AchievementService.checkAll(userId);

    return { session, level, xpEarned: wasAlreadySaved ? 0 : xpAmount };
  },

  async getSessions(filters, userId = DEFAULT_USER_ID) {
    if (filters.page !== undefined) return SessionModel.findPage(filters, userId);
    return SessionModel.findAll(filters, userId);
  },

  async deleteSession(id, userId = DEFAULT_USER_ID) {
    const session = await SessionModel.findById(id, userId);
    if (!session) throw new AppError('Session not found', 404);
    await SessionModel.delete(id, userId);
    await TechnologyModel.recalculateHours(userId);
    await ProjectModel.recalculateHours(userId);
    await StreakModel.recalculate(userId);
    await LevelModel.recalculate(userId);
    await ChallengeModel.updateProgress(userId);
    return { success: true };
  },
};

export const DashboardService = {
  async getDashboard(userId = DEFAULT_USER_ID) {
    const [today, week, month, year, total] = await Promise.all([
      SessionModel.getHoursByPeriod('today', userId),
      SessionModel.getHoursByPeriod('week', userId),
      SessionModel.getHoursByPeriod('month', userId),
      SessionModel.getHoursByPeriod('year', userId),
      SessionModel.getHoursByPeriod('total', userId),
    ]);

    const goal = await GoalModel.get(userId);
    let streak;
    try {
      streak = await StreakModel.recalculate(userId);
    } catch {
      streak = await StreakModel.get(userId);
    }
    const level = await LevelModel.get(userId);
    const recentSessions = await SessionModel.findAll({ limit: 5 }, userId);
    const todayDate = formatLocalDate();
    const todayTechs = await SessionModel.findAll({ date: todayDate }, userId);

    const techMap = {};
    todayTechs.forEach(s => {
      const name = s.project_name || s.technology_name;
      const color = s.project_color || s.technology_color;
      if (!name) return;
      if (!techMap[name]) techMap[name] = { name, color, hours: 0 };
      techMap[name].hours += parseFloat(s.duration_hours);
    });

    const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    const goalProgress = goal.target_hours > 0 ? Math.min((today / goal.target_hours) * 100, 100) : 0;
    const goalCompleted = today >= goal.target_hours;

    return {
      hours: { today, week, month, year, total },
      goal: { target: parseFloat(goal.target_hours), progress: goalProgress, completed: goalCompleted },
      streak: { current: streak.current_streak || 0, longest: streak.longest_streak || 0 },
      level: {
        current: level.current_level,
        xp: level.current_xp,
        totalXp: level.total_xp,
        xpToNext: level.xp_to_next_level,
        progress: (level.current_xp / level.xp_to_next_level) * 100,
      },
      todayTechnologies: Object.values(techMap),
      todayDate: {
        gregorian: todayDate,
        afghan: formatAfghanDate(todayDate),
        numeric: formatAfghanNumericDate(todayDate),
      },
      quote,
      recentActivities: recentSessions,
    };
  },
};

export const StatsService = {
  async getStats(userId = DEFAULT_USER_ID, calendar = 'afghan') {
    const selectedCalendar = ['afghan', 'iranian', 'gregorian'].includes(calendar) ? calendar : 'afghan';
    const [daily, weekly, monthly, yearly, techDist] = await Promise.all([
      SessionModel.getChartData('daily', userId, selectedCalendar),
      SessionModel.getChartData('weekly', userId, selectedCalendar),
      SessionModel.getChartData('monthly', userId, selectedCalendar),
      SessionModel.getChartData('yearly', userId, selectedCalendar),
      SessionModel.getTechDistribution(userId),
    ]);

    const yearStart = getCalendarYearStart(selectedCalendar);
    const yearEnd = formatLocalDate();
    const dailyAgg = await SessionModel.getDailyAggregates(yearStart, yearEnd, userId);

    let bestDay = null, worstDay = null, totalDays = 0, totalHours = 0;
    dailyAgg.forEach(d => {
      const h = parseFloat(d.hours);
      totalHours += h;
      totalDays++;
      if (!bestDay || h > parseFloat(bestDay.hours)) bestDay = d;
      if (!worstDay || (h > 0 && h < parseFloat(worstDay.hours))) worstDay = d;
      if (h > 0 && !worstDay) worstDay = d;
    });

    const avgHours = totalDays > 0 ? totalHours / totalDays : 0;
    const mostStudied = techDist.length > 0 ? techDist[0] : null;

    const last30Start = shiftLocalDate(yearEnd, -29);
    const last30Agg = await SessionModel.getDailyAggregates(last30Start, yearEnd, userId);
    const consistencyScore = Math.min(100, (last30Agg.filter(d => parseFloat(d.hours) > 0).length / 30) * 100);

    return {
      charts: { daily, weekly, monthly, yearly },
      techDistribution: techDist,
      averageHours: parseFloat(avgHours.toFixed(2)),
      bestDay,
      worstDay,
      mostStudied,
      consistencyScore: parseFloat(consistencyScore.toFixed(1)),
      averageHoursPerActiveDay: parseFloat(avgHours.toFixed(2)),
    };
  },

  async getCalendar(year, userId = DEFAULT_USER_ID, calendar = 'afghan') {
    const { startDate, endDate } = getCalendarYearRange(year, calendar);
    const data = await SessionModel.getDailyAggregates(startDate, endDate, userId);
    const map = {};
    data.forEach(d => {
      map[d.session_date] = {
        date: d.session_date,
        hours: parseFloat(d.hours),
        sessions: d.sessions,
        technologies: d.technologies,
      };
    });
    return map;
  },
};

export const AchievementService = {
  async checkAll(userId = DEFAULT_USER_ID) {
    const sessions = await SessionModel.findAll({}, userId);
    const totalHours = sessions.reduce((sum, s) => sum + parseFloat(s.duration_hours), 0);
    const streak = await StreakModel.get(userId);
    const techDist = await SessionModel.getTechDistribution(userId);

    const checks = [
      { key: 'first_session', condition: sessions.length >= 1 },
      { key: 'streak_7', condition: (streak.current_streak || 0) >= 7 },
      { key: 'streak_30', condition: (streak.current_streak || 0) >= 30 },
      { key: 'hours_100', condition: totalHours >= 100 },
      { key: 'hours_500', condition: totalHours >= 500 },
      { key: 'hours_1000', condition: totalHours >= 1000 },
    ];

    techDist.forEach(t => {
      const h = parseFloat(t.hours);
      const key = t.technology_key || inferTechnologyKey(t.name);
      if (key === 'react' && h >= 50) checks.push({ key: 'react_master', condition: true });
      if (key === 'nodejs' && h >= 10) checks.push({ key: 'node_beginner', condition: true });
      if (key === 'tailwind' && h >= 25) checks.push({ key: 'tailwind_expert', condition: true });
    });

    for (const check of checks) {
      if (check.condition && ACHIEVEMENTS[check.key]) {
        const badge = ACHIEVEMENTS[check.key];
        await AchievementModel.unlock(badge.key, badge.name, badge.description, badge.icon, userId);
      }
    }

    await ChallengeModel.updateProgress(userId);
  },

  async getAll(userId = DEFAULT_USER_ID) {
    return AchievementModel.findAll(userId);
  },
};

export const TechnologyService = {
  async getAll(userId = DEFAULT_USER_ID) {
    return TechnologyModel.findAll(userId);
  },

  async create(data, userId = DEFAULT_USER_ID) {
    if (data.category_id && !await CategoryModel.findById(data.category_id, userId)) {
      throw new AppError('Folder not found', 404);
    }
    try {
      return await TechnologyModel.create(data, userId);
    } catch (error) {
      if (error.code === 11000 || error.code === 'ER_DUP_ENTRY') {
        throw new AppError('A technology with this name already exists', 409);
      }
      throw error;
    }
  },

  async update(id, data, userId = DEFAULT_USER_ID) {
    const tech = await TechnologyModel.findById(id, userId);
    if (!tech) throw new AppError('Technology not found', 404);
    if (data.category_id && !await CategoryModel.findById(data.category_id, userId)) {
      throw new AppError('Folder not found', 404);
    }
    try {
      return await TechnologyModel.update(id, data, userId);
    } catch (error) {
      if (error.code === 11000 || error.code === 'ER_DUP_ENTRY') {
        throw new AppError('A technology with this name already exists', 409);
      }
      throw error;
    }
  },

  async delete(id, userId = DEFAULT_USER_ID) {
    const tech = await TechnologyModel.findById(id, userId);
    if (!tech) throw new AppError('Technology not found', 404);
    const deleted = await TechnologyModel.delete(id, userId);
    if (!deleted) throw new AppError('Cannot delete technology', 400);
    return { success: true };
  },
};

export const ProjectService = {
  async getAll(userId = DEFAULT_USER_ID) {
    return ProjectModel.findAll(userId);
  },

  async create(data, userId = DEFAULT_USER_ID) {
    try {
      return await ProjectModel.create(data, userId);
    } catch (error) {
      if (error.code === 11000 || error.code === 'ER_DUP_ENTRY') {
        throw new AppError('A project with this name already exists', 409);
      }
      throw error;
    }
  },

  async update(id, data, userId = DEFAULT_USER_ID) {
    if (!await ProjectModel.findById(id, userId)) throw new AppError('Project not found', 404);
    try {
      return await ProjectModel.update(id, data, userId);
    } catch (error) {
      if (error.code === 11000 || error.code === 'ER_DUP_ENTRY') {
        throw new AppError('A project with this name already exists', 409);
      }
      throw error;
    }
  },

  async delete(id, userId = DEFAULT_USER_ID) {
    if (!await ProjectModel.findById(id, userId)) throw new AppError('Project not found', 404);
    const deleted = await ProjectModel.delete(id, userId);
    if (!deleted) throw new AppError('Cannot delete project', 400);
    return { success: true };
  },
};

export const CategoryService = {
  async getAll(userId = DEFAULT_USER_ID) {
    return CategoryModel.findAll(userId);
  },

  async create(data, userId = DEFAULT_USER_ID) {
    try {
      return await CategoryModel.create(data, userId);
    } catch (error) {
      if (error.code === 11000 || error.code === 'ER_DUP_ENTRY') {
        throw new AppError('A folder with this name already exists', 409);
      }
      throw error;
    }
  },

  async update(id, data, userId = DEFAULT_USER_ID) {
    if (!await CategoryModel.findById(id, userId)) throw new AppError('Folder not found', 404);
    try {
      return await CategoryModel.update(id, data, userId);
    } catch (error) {
      if (error.code === 11000 || error.code === 'ER_DUP_ENTRY') {
        throw new AppError('A folder with this name already exists', 409);
      }
      throw error;
    }
  },

  async delete(id, userId = DEFAULT_USER_ID) {
    if (!await CategoryModel.findById(id, userId)) throw new AppError('Folder not found', 404);
    await CategoryModel.delete(id, userId);
    return { success: true };
  },

  async move(id, direction, userId = DEFAULT_USER_ID) {
    const category = await CategoryModel.move(id, direction, userId);
    if (!category) throw new AppError('Folder not found', 404);
    return category;
  },
};

export const GoalService = {
  async get(userId = DEFAULT_USER_ID) {
    return GoalModel.get(userId);
  },

  async update(targetHours, userId = DEFAULT_USER_ID) {
    return GoalModel.update(targetHours, userId);
  },
};

export const NoteService = {
  async getByDate(date, userId = DEFAULT_USER_ID) {
    return NoteModel.getByDate(date, userId);
  },

  async save(date, content, productivityScore, userId = DEFAULT_USER_ID) {
    return NoteModel.upsert(date, content, productivityScore, userId);
  },

  async getAll(userId = DEFAULT_USER_ID) {
    return NoteModel.findAll(userId);
  },
};

export const ChallengeService = {
  async getAll(userId = DEFAULT_USER_ID) {
    await ChallengeModel.ensureDefaults(userId);
    await ChallengeModel.updateProgress(userId);
    return ChallengeModel.findAll(userId);
  },
  async create(userId = DEFAULT_USER_ID, data) {
    return ChallengeModel.create(userId, data);
  },
  async delete(userId = DEFAULT_USER_ID, id) {
    return ChallengeModel.delete(userId, id);
  },
};

export const UserService = {
  async getProfile(userId = DEFAULT_USER_ID) {
    const user = await UserModel.findById(userId);
    if (!user) return null;
    const { password_hash, ...rest } = user;
    return rest;
  },

  async updateSettings(data, userId = DEFAULT_USER_ID) {
    const user = await UserModel.update(userId, data);
    if (!user) return null;
    const { password_hash, ...rest } = user;
    return rest;
  },

  async uploadAvatar(fileBuffer, userId = DEFAULT_USER_ID) {
    if (!fileBuffer) throw new AppError('No image file uploaded', 400);
    const result = await uploadAvatarBuffer(fileBuffer, userId);
    const user = await UserModel.update(userId, { avatar_url: result.secure_url });
    if (!user) throw new AppError('User not found', 404);
    const { password_hash, ...rest } = user;
    return rest;
  },

  async removeAvatar(userId = DEFAULT_USER_ID) {
    const existing = await UserModel.findById(userId);
    const fallbackAvatar = getDeterministicAvatar(existing?.username || existing?.id || userId);
    const user = await UserModel.update(userId, { avatar_url: fallbackAvatar });
    if (!user) throw new AppError('User not found', 404);
    const { password_hash, ...rest } = user;
    return rest;
  },
};

export const ExportService = {
  async exportData(format, userId = DEFAULT_USER_ID) {
    if (format !== 'json') throw new AppError('Only JSON backups are supported', 400);
    const userIds = await getTargetUserIds(userId);
    const [sessions, technologies, projects, categories, notes, achievements, challenges, goal, level, user] = await Promise.all([
      SessionModel.findAll({}, userId),
      TechnologyModel.findAll(userId),
      ProjectModel.findAll(userId),
      TechnologyCategory.find({ user_id: { $in: userIds } }).sort({ sort_order: 1 }).lean(),
      NoteModel.findAll(userId),
      AchievementModel.findAll(userId),
      Challenge.find({ user_id: { $in: userIds } }).lean(),
      GoalModel.get(userId),
      LevelModel.get(userId),
      UserModel.findById(userId),
    ]);
    return {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      sessions,
      technologies,
      projects,
      categories: categories.map(category => ({ ...category, id: category._id.toString() })),
      notes,
      achievements,
      challenges: challenges.map(challenge => ({ ...challenge.toObject?.() || challenge, id: String(challenge._id) })),
      goal,
      level,
      settings: user ? {
        theme: user.theme,
        calendar_type: user.calendar_type,
        notification_enabled: user.notification_enabled,
        notification_time: user.notification_time,
        is_profile_public: user.is_profile_public,
        allow_direct_messages: user.allow_direct_messages,
      } : {},
      format,
    };
  },

  async importData(payload, userId = DEFAULT_USER_ID) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new AppError('Invalid JSON backup file', 400);
    const maxRecords = 10000;
    const arrayField = (key) => {
      const value = payload[key] ?? [];
      if (!Array.isArray(value) || value.length > maxRecords) throw new AppError(`Invalid or too large backup section: ${key}`, 400);
      return value;
    };
    const categories = arrayField('categories');
    const technologies = arrayField('technologies');
    const projects = arrayField('projects');
    const sessions = arrayField('sessions');
    const notes = arrayField('notes');
    const achievements = arrayField('achievements');
    const challenges = arrayField('challenges');
    const userIds = await getTargetUserIds(userId);
    const oldId = (item) => String(item?.id || item?._id || '');
    const categoryMap = new Map();
    const technologyMap = new Map();
    const projectMap = new Map();
    const warnings = [];
    const warn = (message) => { if (warnings.length < 25) warnings.push(message); };

    for (const category of categories) {
      if (typeof category?.name !== 'string' || !category.name.trim()) { warn('A category without a name was skipped.'); continue; }
      let target = await TechnologyCategory.findOne({ user_id: { $in: userIds }, name: category.name.trim() }).lean();
      if (!target) target = await CategoryModel.create({ name: category.name.trim(), color: category.color || '#3B82F6' }, userId);
      if (oldId(category)) categoryMap.set(oldId(category), String(target.id || target._id));
    }

    for (const technology of technologies) {
      if (typeof technology?.name !== 'string' || !technology.name.trim()) { warn('A technology without a name was skipped.'); continue; }
      let target = await Technology.findOne({ user_id: { $in: userIds }, name: technology.name.trim() }).lean();
      if (!target) {
        target = await TechnologyModel.create({
          name: technology.name.trim(), color: technology.color || '#3B82F6', icon: technology.icon || 'code',
          custom_icon: technology.custom_icon || null,
          category_id: categoryMap.get(String(technology.category_id)) || null,
        }, userId);
      }
      if (oldId(technology)) technologyMap.set(oldId(technology), String(target.id || target._id));
      technologyMap.set(`name:${technology.name.trim().toLowerCase()}`, String(target.id || target._id));
    }

    for (const project of projects) {
      if (typeof project?.name !== 'string' || !project.name.trim()) { warn('A project without a name was skipped.'); continue; }
      let target = await Project.findOne({ user_id: { $in: userIds }, name: project.name.trim() }).lean();
      if (!target) target = await ProjectModel.create({
        name: project.name.trim(), color: project.color || '#8B5CF6', description: project.description || '',
      }, userId);
      if (oldId(project)) projectMap.set(oldId(project), String(target.id || target._id));
      projectMap.set(`name:${project.name.trim().toLowerCase()}`, String(target.id || target._id));
    }

    const sessionOperations = [];
    for (const session of sessions) {
      const durationMinutes = Math.round(Number(session?.duration_minutes || Number(session?.duration_hours || 0) * 60));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(session?.session_date || '')) || durationMinutes < 1 || durationMinutes > 720) {
        warn('A study session with an invalid date or duration was skipped.'); continue;
      }
      const technologyId = technologyMap.get(String(session.technology_id))
        || (session.technology_name ? technologyMap.get(`name:${String(session.technology_name).trim().toLowerCase()}`) : null);
      const projectId = projectMap.get(String(session.project_id))
        || (session.project_name ? projectMap.get(`name:${String(session.project_name).trim().toLowerCase()}`) : null);
      if (!technologyId && !projectId) { warn('A study session without a matching technology or project was skipped.'); continue; }
      const stableKey = createHash('sha256').update(JSON.stringify([
        oldId(session), session.session_date, session.start_time, durationMinutes, session.note || '',
      ])).digest('hex');
      const clientSessionId = `import_${stableKey}`;
      sessionOperations.push({
        updateOne: {
          filter: { user_id: String(userId), client_session_id: clientSessionId },
          update: { $setOnInsert: {
            user_id: String(userId), technology_id: technologyId, project_id: projectId,
            session_date: session.session_date, start_time: session.start_time || '00:00:00', end_time: session.end_time || '00:00:00',
            duration_minutes: durationMinutes, duration_hours: Number((durationMinutes / 60).toFixed(4)),
            note: typeof session.note === 'string' ? session.note.slice(0, 1000) : null,
            client_session_id: clientSessionId, source: 'import', kind: 'focus',
          } },
          upsert: true,
        },
      });
    }
    const sessionResult = sessionOperations.length
      ? await StudySession.bulkWrite(sessionOperations, { ordered: false })
      : { upsertedCount: 0 };

    const noteOperations = notes.filter(note => /^\d{4}-\d{2}-\d{2}$/.test(String(note?.note_date || '')))
      .map(note => ({ updateOne: {
        filter: { user_id: String(userId), note_date: note.note_date },
        update: { $setOnInsert: {
          user_id: String(userId), note_date: note.note_date,
          content: typeof note.content === 'string' ? note.content.slice(0, 10000) : null,
          productivity_score: Number.isInteger(Number(note.productivity_score)) ? Math.max(1, Math.min(10, Number(note.productivity_score))) : null,
        } },
        upsert: true,
      } }));
    if (noteOperations.length) await DailyNote.bulkWrite(noteOperations, { ordered: false });

    for (const achievement of achievements) {
      if (!achievement?.badge_key || typeof achievement.badge_key !== 'string') continue;
      const def = ACHIEVEMENTS[achievement.badge_key];
      if (def) await AchievementModel.unlock(def.key, def.name, def.description, def.icon, userId);
    }
    for (const challenge of challenges) {
      if (!challenge?.challenge_key?.startsWith('custom_') || !String(challenge.challenge_name || '').trim()) continue;
      const exists = await Challenge.exists({ user_id: { $in: userIds }, challenge_key: challenge.challenge_key });
      if (!exists && ['hours', 'days'].includes(challenge.unit) && Number(challenge.target_value) > 0) {
        await Challenge.create({
          user_id: String(userId), challenge_key: challenge.challenge_key,
          challenge_name: String(challenge.challenge_name).slice(0, 120),
          challenge_description: String(challenge.challenge_description || '').slice(0, 500) || null,
          target_value: Math.min(10000, Number(challenge.target_value)), current_value: 0, unit: challenge.unit,
          status: 'active', started_at: Number.isFinite(new Date(challenge.started_at).getTime()) ? new Date(challenge.started_at) : new Date(), completed_at: null,
        });
      }
    }
    if (payload.goal && Number(payload.goal.target_hours) >= 0.5 && Number(payload.goal.target_hours) <= 24) {
      await GoalModel.update(Number(payload.goal.target_hours), userId);
    }
    if (payload.settings && typeof payload.settings === 'object') {
      const allowedSettings = ['theme', 'calendar_type', 'notification_enabled', 'notification_time', 'is_profile_public', 'allow_direct_messages'];
      const settings = Object.fromEntries(allowedSettings.filter(key => payload.settings[key] !== undefined).map(key => [key, payload.settings[key]]));
      if (Object.keys(settings).length) await UserModel.update(userId, settings);
    }

    await Promise.all([
      TechnologyModel.recalculateHours(userId), ProjectModel.recalculateHours(userId),
      StreakModel.recalculate(userId), LevelModel.recalculate(userId),
    ]);
    await AchievementService.checkAll(userId);
    await ChallengeModel.updateProgress(userId);
    return { importedSessions: sessionResult.upsertedCount || 0, success: true, warnings };
  },
};
