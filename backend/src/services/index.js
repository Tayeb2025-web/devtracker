import { SessionModel } from '../models/SessionModel.js';
import { TechnologyModel } from '../models/TechnologyModel.js';
import { ProjectModel } from '../models/ProjectModel.js';
import { CategoryModel } from '../models/CategoryModel.js';
import { GoalModel, StreakModel, LevelModel, AchievementModel, ChallengeModel, NoteModel } from '../models/GoalModel.js';
import { UserModel, getDeterministicAvatar } from '../models/UserModel.js';
import { XP_PER_HOUR, ACHIEVEMENTS, MOTIVATIONAL_QUOTES, DEFAULT_USER_ID } from '../config/constants.js';
import { AppError } from '../middlewares/errorHandler.js';
import { afghanToGregorianDate, formatAfghanDate, formatAfghanNumericDate, formatLocalDate, getLocalYearStart, shiftLocalDate } from '../utils/date.js';
import { uploadAvatarBuffer } from '../config/cloudinary.js';

export const SessionService = {
  async createSession(data, userId = DEFAULT_USER_ID) {
    const normalizedData = {
      ...data,
      technology_id: data.technology_id ? String(data.technology_id) : null,
      project_id: data.project_id ? String(data.project_id) : null,
      duration_minutes: Number(data.duration_minutes),
      duration_hours: Number((Number(data.duration_minutes) / 60).toFixed(4)),
    };
    if (!normalizedData.technology_id && !normalizedData.project_id) {
      throw new AppError('Select a technology or a project', 400);
    }
    if (normalizedData.technology_id) {
      const tech = await TechnologyModel.findById(normalizedData.technology_id, userId);
      if (!tech) throw new AppError('Technology not found', 404);
    }
    if (normalizedData.project_id) {
      const project = await ProjectModel.findById(normalizedData.project_id, userId);
      if (!project) throw new AppError('Project not found', 404);
    }

    const session = await SessionModel.create(normalizedData, userId);

    if (normalizedData.technology_id) {
      try {
        await TechnologyModel.updateTotalHours(normalizedData.technology_id, normalizedData.duration_hours, userId);
      } catch (err) {
        console.error('Failed to update technology total hours:', err);
      }
    }
    if (normalizedData.project_id) {
      try {
        await ProjectModel.updateTotalHours(normalizedData.project_id, normalizedData.duration_hours, userId);
      } catch (err) {
        console.error('Failed to update project total hours:', err);
      }
    }

    try {
      await StreakModel.recalculate(userId);
    } catch (err) {
      console.error('Failed to recalculate streak:', err);
    }

    const xpAmount = Math.round(normalizedData.duration_hours * XP_PER_HOUR);
    let level = null;
    try {
      level = await LevelModel.addXp(xpAmount, session.id, userId);
    } catch (err) {
      console.error('Failed to add XP:', err);
      try {
        level = await LevelModel.get(userId);
      } catch {
        level = { current_level: 1, current_xp: 0, total_xp: 0, xp_to_next_level: 1000 };
      }
    }

    try {
      await AchievementService.checkAll(userId);
    } catch (err) {
      console.error('Failed to check achievements:', err);
    }

    return { session, level, xpEarned: xpAmount };
  },

  async getSessions(filters, userId = DEFAULT_USER_ID) {
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
  async getStats(userId = DEFAULT_USER_ID) {
    const [daily, weekly, monthly, yearly, techDist] = await Promise.all([
      SessionModel.getChartData('daily', userId),
      SessionModel.getChartData('weekly', userId),
      SessionModel.getChartData('monthly', userId),
      SessionModel.getChartData('yearly', userId),
      SessionModel.getTechDistribution(userId),
    ]);

    const yearStart = getLocalYearStart();
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

    const last30Start = shiftLocalDate(yearEnd, -30);
    const last30Agg = await SessionModel.getDailyAggregates(last30Start, yearEnd, userId);
    const focusScore = Math.min(100, (last30Agg.filter(d => parseFloat(d.hours) > 0).length / 30) * 100);

    return {
      charts: { daily, weekly, monthly, yearly },
      techDistribution: techDist,
      averageHours: parseFloat(avgHours.toFixed(2)),
      bestDay,
      worstDay,
      mostStudied,
      focusScore: parseFloat(focusScore.toFixed(1)),
    };
  },

  async getCalendar(year, userId = DEFAULT_USER_ID) {
    const startDate = afghanToGregorianDate(year, 1, 1);
    const endDate = shiftLocalDate(afghanToGregorianDate(Number(year) + 1, 1, 1), -1);
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
      if (t.name === 'React' && h >= 50) checks.push({ key: 'react_master', condition: true });
      if (t.name === 'Node.js' && h >= 10) checks.push({ key: 'node_beginner', condition: true });
      if (t.name === 'Tailwind' && h >= 25) checks.push({ key: 'tailwind_expert', condition: true });
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
    const sessions = await SessionModel.findAll({}, userId);
    const technologies = await TechnologyModel.findAll(userId);
    const projects = await ProjectModel.findAll(userId);
    const notes = await NoteModel.findAll(userId);
    const achievements = await AchievementModel.findAll(userId);
    const level = await LevelModel.get(userId);

    return {
      exportedAt: new Date().toISOString(),
      sessions,
      technologies,
      projects,
      notes,
      achievements,
      level,
      format,
    };
  },

  async importData(payload, userId = DEFAULT_USER_ID) {
    if (!payload || typeof payload !== 'object') {
      throw new AppError('Invalid JSON backup file', 400);
    }
    const { technologies = [], projects = [], notes = [], sessions = [] } = payload;
    let importedCount = 0;

    for (const tech of technologies) {
      if (tech.name) {
        try {
          await TechnologyModel.create({ name: tech.name, color: tech.color || '#3B82F6', icon: tech.icon || 'code' }, userId);
        } catch {}
      }
    }

    for (const proj of projects) {
      if (proj.name) {
        try {
          await ProjectModel.create({ name: proj.name, color: proj.color || '#8B5CF6', description: proj.description || '' }, userId);
        } catch {}
      }
    }

    for (const note of notes) {
      if (note.note_date && note.content) {
        try {
          await NoteModel.upsert(note.note_date, note.content, note.productivity_score || 5, userId);
        } catch {}
      }
    }

    for (const s of sessions) {
      const durationMinutes = Number(s.duration_minutes || (parseFloat(s.duration_hours || 0) * 60));
      if (durationMinutes >= 1) {
        try {
          await SessionModel.create({
            session_date: s.session_date,
            start_time: s.start_time || '00:00:00',
            end_time: s.end_time || '00:00:00',
            duration_minutes: Math.round(durationMinutes),
            duration_hours: Number((durationMinutes / 60).toFixed(4)),
            note: s.note || null,
            technology_id: s.technology_id || null,
            project_id: s.project_id || null,
          }, userId);
          importedCount++;
        } catch {}
      }
    }

    await StreakModel.recalculate(userId);
    await LevelModel.recalculate(userId);
    await TechnologyModel.recalculateHours(userId);
    await ProjectModel.recalculateHours(userId);

    return { importedSessions: importedCount, success: true };
  },
};
