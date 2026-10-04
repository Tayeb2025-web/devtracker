import mongoose from 'mongoose';
import { DEFAULT_USER_ID } from '../config/constants.js';
import {
  formatAfghanDate,
  formatAfghanMonth,
  formatLocalDate,
  getCalendarDateParts,
  getLocalMonthStart,
  getLocalWeekRange,
  getLocalYearStart,
  shiftLocalDate,
} from '../utils/date.js';
import { getTargetUserIds } from '../utils/userHelper.js';

const SessionSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  technology_id: { type: String, default: null, index: true },
  project_id: { type: String, default: null, index: true },
  session_date: { type: String, required: true, index: true },
  start_time: { type: String, required: true },
  end_time: { type: String, required: true },
  duration_minutes: { type: Number, required: true },
  duration_hours: { type: Number, required: true },
  note: { type: String, default: null },
  technology_name: { type: String, default: null },
  technology_color: { type: String, default: null },
  project_name: { type: String, default: null },
  project_color: { type: String, default: null },
  client_session_id: { type: String, default: null, maxlength: 128 },
  source: { type: String, enum: ['timer', 'manual', 'import'], default: 'manual' },
  kind: { type: String, enum: ['focus', 'break'], default: 'focus' },
  legacy_id: { type: Number, index: true },
}, {
  collection: 'studysessions',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret.__v; return ret; } },
  toObject: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret.__v; return ret; } },
});

SessionSchema.virtual('id').get(function () {
  return this._id.toString();
});
SessionSchema.index({ user_id: 1, session_date: -1, start_time: -1 });
SessionSchema.index({ user_id: 1, client_session_id: 1 }, {
  unique: true,
  partialFilterExpression: { client_session_id: { $type: 'string' } },
});

export const StudySession = mongoose.models.StudySession || mongoose.model('StudySession', SessionSchema);

async function buildSessionQuery(filters, userIds) {
  const query = { user_id: { $in: userIds } };

  if (filters.date) query.session_date = filters.date;
  if (filters.startDate && filters.endDate) {
    query.session_date = { $gte: filters.startDate, $lte: filters.endDate };
  }

  const clauses = [];
  if (filters.technologyId) {
    clauses.push({ $or: [
      { technology_id: String(filters.technologyId) },
      { technology_id: String(Number(filters.technologyId) || -1) },
    ] });
  }
  if (filters.projectId) {
    clauses.push({ $or: [
      { project_id: String(filters.projectId) },
      { project_id: String(Number(filters.projectId) || -1) },
    ] });
  }
  if (filters.search) {
    const escaped = String(filters.search).trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (escaped) {
      const search = new RegExp(escaped, 'i');
      const { Technology } = await import('./TechnologyModel.js');
      const { Project } = await import('./ProjectModel.js');
      const [matchingTechnologies, matchingProjects] = await Promise.all([
        Technology.find({ user_id: { $in: userIds }, name: search }).select('_id legacy_id').lean(),
        Project.find({ user_id: { $in: userIds }, name: search }).select('_id legacy_id').lean(),
      ]);
      const technologyIds = matchingTechnologies.flatMap(item => [item._id.toString(), item.legacy_id].filter(value => value !== undefined && value !== null).map(String));
      const projectIds = matchingProjects.flatMap(item => [item._id.toString(), item.legacy_id].filter(value => value !== undefined && value !== null).map(String));
      const searchConditions = [
        { note: search },
        { technology_name: search },
        { project_name: search },
      ];
      if (technologyIds.length) searchConditions.push({ technology_id: { $in: technologyIds } });
      if (projectIds.length) searchConditions.push({ project_id: { $in: projectIds } });
      clauses.push({ $or: searchConditions });
    }
  }
  if (clauses.length) query.$and = clauses;
  return query;
}

function getSessionSort(sortBy) {
  const sorts = {
    'date-asc': { session_date: 1, start_time: 1, _id: 1 },
    'duration-desc': { duration_minutes: -1, session_date: -1, _id: -1 },
    'duration-asc': { duration_minutes: 1, session_date: -1, _id: -1 },
  };
  return sorts[sortBy] || { session_date: -1, start_time: -1, _id: -1 };
}

export const SessionModel = {
  async findAll(filters = {}, userId = DEFAULT_USER_ID) {
    const { Technology } = await import('./TechnologyModel.js');
    const { Project } = await import('./ProjectModel.js');

    const userIds = await getTargetUserIds(userId);
    const query = await buildSessionQuery(filters, userIds);

    let sessions = await StudySession.find(query)
      .sort(getSessionSort(filters.sortBy))
      .skip(Math.max(0, Number(filters.skip) || 0))
      .limit(filters.limit ? parseInt(filters.limit) : 0)
      .lean();

    // Attach technology and project names/colors
    const techs = await Technology.find({
      user_id: { $in: userIds }
    }).lean();
    const projects = await Project.find({
      user_id: { $in: userIds }
    }).lean();

    const techMap = new Map();
    techs.forEach(t => {
      techMap.set(t._id.toString(), t);
      if (t.legacy_id) techMap.set(String(t.legacy_id), t);
    });

    const projectMap = new Map();
    projects.forEach(p => {
      projectMap.set(p._id.toString(), p);
      if (p.legacy_id) projectMap.set(String(p.legacy_id), p);
    });

    const results = sessions.map(s => {
      const tech = s.technology_id ? techMap.get(String(s.technology_id)) : null;
      const project = s.project_id ? projectMap.get(String(s.project_id)) : null;
      return {
        ...s,
        id: s._id.toString(),
        technology_name: tech?.name || s.technology_name || null,
        technology_color: tech?.color || s.technology_color || null,
        project_name: project?.name || s.project_name || null,
        project_color: project?.color || s.project_color || null,
      };
    });

    return results;
  },

  async findPage(filters = {}, userId = DEFAULT_USER_ID) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 25));
    const userIds = await getTargetUserIds(userId);
    const query = await buildSessionQuery(filters, userIds);
    const [items, total] = await Promise.all([
      this.findAll({ ...filters, skip: (page - 1) * pageSize, limit: pageSize }, userId),
      StudySession.countDocuments(query),
    ]);
    return {
      items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async findById(id, userId = DEFAULT_USER_ID) {
    if (!id) return null;
    const { Technology } = await import('./TechnologyModel.js');
    const { Project } = await import('./ProjectModel.js');

    const userIds = await getTargetUserIds(userId);
    let session;
    if (mongoose.Types.ObjectId.isValid(String(id))) {
      session = await StudySession.findOne({
        _id: id,
        user_id: { $in: userIds }
      }).lean();
    }
    if (!session) {
      session = await StudySession.findOne({
        legacy_id: Number(id) || -1,
        user_id: { $in: userIds }
      }).lean();
    }
    if (!session) return null;

    let tech = null;
    if (session.technology_id) {
      if (mongoose.Types.ObjectId.isValid(String(session.technology_id))) {
        tech = await Technology.findOne({ _id: session.technology_id, user_id: { $in: userIds } }).lean();
      }
      if (!tech) {
        tech = await Technology.findOne({ legacy_id: Number(session.technology_id) || -1, user_id: { $in: userIds } }).lean();
      }
    }

    let project = null;
    if (session.project_id) {
      if (mongoose.Types.ObjectId.isValid(String(session.project_id))) {
        project = await Project.findOne({ _id: session.project_id, user_id: { $in: userIds } }).lean();
      }
      if (!project) {
        project = await Project.findOne({ legacy_id: Number(session.project_id) || -1, user_id: { $in: userIds } }).lean();
      }
    }

    return {
      ...session,
      id: session._id.toString(),
      technology_name: tech?.name || session.technology_name || null,
      technology_color: tech?.color || session.technology_color || null,
      project_name: project?.name || session.project_name || null,
      project_color: project?.color || session.project_color || null,
    };
  },

  async create(data, userId = DEFAULT_USER_ID) {
    const { technology_id, project_id, session_date, start_time, end_time, duration_minutes, note, client_session_id, source = 'manual', kind = 'focus' } = data;
    const userIds = await getTargetUserIds(userId);
    if (client_session_id) {
      const existing = await StudySession.findOne({ user_id: { $in: userIds }, client_session_id }).lean();
      if (existing) return { ...(await this.findById(existing._id, userId)), alreadyExisted: true };
    }
    let created;
    try {
      created = await StudySession.create({
      user_id: String(userId),
      technology_id: technology_id ? String(technology_id) : null,
      project_id: project_id ? String(project_id) : null,
      technology_name: data.technology_name || null,
      technology_color: data.technology_color || null,
      project_name: data.project_name || null,
      project_color: data.project_color || null,
      session_date,
      start_time,
      end_time,
      duration_minutes: Number(duration_minutes),
      duration_hours: Number((Number(duration_minutes) / 60).toFixed(4)),
      note: note || null,
      client_session_id: client_session_id || null,
      source,
      kind,
      });
    } catch (error) {
      if (error.code !== 11000 || !client_session_id) throw error;
      const existing = await StudySession.findOne({ user_id: { $in: userIds }, client_session_id }).lean();
      if (!existing) throw error;
      return { ...(await this.findById(existing._id, userId)), alreadyExisted: true };
    }
    return this.findById(created._id, userId);
  },

  async delete(id, userId = DEFAULT_USER_ID) {
    const session = await this.findById(id, userId);
    if (!session) return false;

    const userIds = await getTargetUserIds(userId);
    const { XpHistory } = await import('./GoalModel.js');
    await XpHistory.deleteMany({ session_id: session.id, user_id: { $in: userIds } });

    const result = await StudySession.deleteOne({ _id: session._id, user_id: { $in: userIds } });
    return result.deletedCount > 0;
  },

  async getHoursByPeriod(period, userId = DEFAULT_USER_ID) {
    const today = formatLocalDate();
    const week = getLocalWeekRange();
    const ranges = {
      today: { session_date: today },
      week: { session_date: { $gte: week.startDate, $lte: week.endDate } },
      month: { session_date: { $gte: getLocalMonthStart(), $lte: today } },
      year: { session_date: { $gte: getLocalYearStart(), $lte: today } },
    };

    const userIds = await getTargetUserIds(userId);
    const matchQuery = {
      user_id: { $in: userIds }
    };
    if (ranges[period]) {
      Object.assign(matchQuery, ranges[period]);
    }

    const agg = await StudySession.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, total: { $sum: '$duration_hours' } } }
    ]);
    return parseFloat((agg[0]?.total || 0).toFixed(4));
  },

  async getDailyAggregates(startDate, endDate, userId = DEFAULT_USER_ID) {
    const { Technology } = await import('./TechnologyModel.js');
    const { Project } = await import('./ProjectModel.js');

    const userIds = await getTargetUserIds(userId);
    const days = await StudySession.aggregate([
      {
        $match: {
          user_id: { $in: userIds },
          session_date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$session_date',
          hours: {
            $sum: {
              $convert: { input: '$duration_hours', to: 'double', onError: 0, onNull: 0 },
            },
          },
          sessions: { $sum: 1 },
          references: {
            $addToSet: {
              $cond: [
                { $ne: [{ $ifNull: ['$technology_id', null] }, null] },
                '$technology_id',
                { $ifNull: ['$project_id', null] },
              ],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const techs = await Technology.find({
      user_id: { $in: userIds }
    }).lean();
    const projects = await Project.find({
      user_id: { $in: userIds }
    }).lean();

    const techMap = new Map();
    techs.forEach(t => {
      techMap.set(t._id.toString(), t.name);
      if (t.legacy_id !== undefined && t.legacy_id !== null) techMap.set(String(t.legacy_id), t.name);
    });
    projects.forEach(p => {
      techMap.set(p._id.toString(), p.name);
      if (p.legacy_id !== undefined && p.legacy_id !== null) techMap.set(String(p.legacy_id), p.name);
    });

    return days.map(day => ({
      session_date: day._id,
      hours: parseFloat(Number(day.hours || 0).toFixed(4)),
      sessions: day.sessions,
      technologies: [...new Set((day.references || []).map(id => techMap.get(String(id))).filter(Boolean))].join(', '),
    }));
  },

  async getTechDistribution(userId = DEFAULT_USER_ID) {
    const { Technology } = await import('./TechnologyModel.js');
    const userIds = await getTargetUserIds(userId);
    const [techs, aggregates] = await Promise.all([
      Technology.find({ user_id: { $in: userIds } }).lean(),
      StudySession.aggregate([
        { $match: { user_id: { $in: userIds }, technology_id: { $ne: null } } },
        { $group: { _id: '$technology_id', total: { $sum: '$duration_hours' } } },
      ]),
    ]);
    const hoursByTechnologyId = new Map(aggregates.map(row => [String(row._id), Number(row.total || 0)]));

    const results = techs.map(t => {
      const hours = hoursByTechnologyId.get(t._id.toString())
        ?? hoursByTechnologyId.get(String(t.legacy_id || -1))
        ?? 0;
      return {
        id: t._id.toString(),
        name: t.name,
        technology_key: t.technology_key || null,
        color: t.color,
        hours: parseFloat(hours.toFixed(4)),
      };
    });

    return results.sort((a, b) => b.hours - a.hours);
  },

  async getChartData(period, userId = DEFAULT_USER_ID, calendar = 'afghan') {
    const today = formatLocalDate();

    if (period === 'daily') {
      const startDate = shiftLocalDate(today, -30);
      const rows = await this.getDailyAggregates(startDate, today, userId);
      const map = new Map(rows.map(r => [r.session_date, parseFloat(r.hours)]));

      const result = [];
      let curr = startDate;
      while (curr <= today) {
        const hours = map.get(curr) || 0;
        result.push({
          date: curr,
          label: formatAfghanDate(curr),
          hours: parseFloat(hours.toFixed(4)),
        });
        curr = shiftLocalDate(curr, 1);
      }
      return result;
    }

    if (period === 'weekly') {
      const rows = await this.getDailyAggregates(shiftLocalDate(today, -84), today, userId);
      const weeks = new Map();
      rows.forEach(row => {
        const range = getLocalWeekRange(row.session_date);
        const current = weeks.get(range.startDate) || {
          startDate: range.startDate,
          endDate: range.endDate,
          date: range.startDate,
          label: `هفته ${formatAfghanDate(range.startDate)}`,
          hours: 0,
        };
        current.hours += parseFloat(row.hours);
        weeks.set(range.startDate, current);
      });
      return [...weeks.values()].map(row => ({ ...row, hours: parseFloat(row.hours.toFixed(4)) }));
    }

    if (period === 'monthly') {
      const rows = await this.getDailyAggregates(shiftLocalDate(today, -365), today, userId);
      const months = new Map();
      rows.forEach(row => {
        const parts = getCalendarDateParts(row.session_date, calendar);
        const key = `${parts.year}-${String(parts.month).padStart(2, '0')}`;
        const current = months.get(key) || {
          key,
          date: row.session_date,
          year: parts.year,
          month: parts.month,
          label: formatAfghanMonth(parts.year, parts.month),
          hours: 0,
        };
        current.hours += parseFloat(row.hours);
        months.set(key, current);
      });
      return [...months.values()].map(row => ({ ...row, hours: parseFloat(row.hours.toFixed(4)) }));
    }

    const userIds = await getTargetUserIds(userId);
    const rows = await StudySession.find({
      user_id: { $in: userIds }
    }).lean();

    const years = new Map();
    rows.forEach(row => {
      const { year } = getCalendarDateParts(row.session_date, calendar);
      const current = years.get(year) || {
        year,
        date: row.session_date,
        label: String(year),
        hours: 0,
      };
      current.hours += parseFloat(row.duration_hours || 0);
      years.set(year, current);
    });
    return [...years.values()].map(row => ({ ...row, hours: parseFloat(row.hours.toFixed(4)) }));
  },
};
