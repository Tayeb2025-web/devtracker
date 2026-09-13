import mongoose from 'mongoose';
import { DEFAULT_USER_ID } from '../config/constants.js';
import {
  formatAfghanDate,
  formatAfghanMonth,
  formatLocalDate,
  getAfghanDateParts,
  getLocalMonthStart,
  getLocalWeekRange,
  getLocalYearStart,
  shiftLocalDate,
} from '../utils/date.js';

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
  legacy_id: { type: Number, index: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret.__v; return ret; } },
  toObject: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret.__v; return ret; } },
});

SessionSchema.virtual('id').get(function () {
  return this._id.toString();
});

export const StudySession = mongoose.models.StudySession || mongoose.model('StudySession', SessionSchema);

export const SessionModel = {
  async findAll(filters = {}, userId = DEFAULT_USER_ID) {
    const { Technology } = await import('./TechnologyModel.js');
    const { Project } = await import('./ProjectModel.js');

    const query = {
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    };

    if (filters.date) {
      query.session_date = filters.date;
    }
    if (filters.startDate && filters.endDate) {
      query.session_date = { $gte: filters.startDate, $lte: filters.endDate };
    }
    if (filters.technologyId) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { technology_id: String(filters.technologyId) },
          { technology_id: String(Number(filters.technologyId) || -1) }
        ]
      });
    }
    if (filters.projectId) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { project_id: String(filters.projectId) },
          { project_id: String(Number(filters.projectId) || -1) }
        ]
      });
    }

    let sessions = await StudySession.find(query)
      .sort({ session_date: -1, start_time: -1 })
      .limit(filters.limit ? parseInt(filters.limit) : 0)
      .lean();

    // Attach technology and project names/colors
    const techs = await Technology.find({
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    }).lean();
    const projects = await Project.find({
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
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

    let results = sessions.map(s => {
      const tech = s.technology_id ? techMap.get(String(s.technology_id)) : null;
      const project = s.project_id ? projectMap.get(String(s.project_id)) : null;
      return {
        ...s,
        id: s._id.toString(),
        technology_name: tech?.name || null,
        technology_color: tech?.color || null,
        project_name: project?.name || null,
        project_color: project?.color || null,
      };
    });

    if (filters.search) {
      const term = filters.search.toLowerCase();
      results = results.filter(s =>
        (s.note && s.note.toLowerCase().includes(term)) ||
        (s.technology_name && s.technology_name.toLowerCase().includes(term)) ||
        (s.project_name && s.project_name.toLowerCase().includes(term))
      );
    }

    return results;
  },

  async findById(id, userId = DEFAULT_USER_ID) {
    if (!id) return null;
    const { Technology } = await import('./TechnologyModel.js');
    const { Project } = await import('./ProjectModel.js');

    let session;
    if (mongoose.Types.ObjectId.isValid(String(id))) {
      session = await StudySession.findOne({
        _id: id,
        $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
      }).lean();
    }
    if (!session) {
      session = await StudySession.findOne({
        legacy_id: Number(id) || -1,
        $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
      }).lean();
    }
    if (!session) return null;

    let tech = null;
    if (session.technology_id) {
      if (mongoose.Types.ObjectId.isValid(String(session.technology_id))) {
        tech = await Technology.findById(session.technology_id).lean();
      }
      if (!tech) {
        tech = await Technology.findOne({ legacy_id: Number(session.technology_id) || -1 }).lean();
      }
    }

    let project = null;
    if (session.project_id) {
      if (mongoose.Types.ObjectId.isValid(String(session.project_id))) {
        project = await Project.findById(session.project_id).lean();
      }
      if (!project) {
        project = await Project.findOne({ legacy_id: Number(session.project_id) || -1 }).lean();
      }
    }

    return {
      ...session,
      id: session._id.toString(),
      technology_name: tech?.name || null,
      technology_color: tech?.color || null,
      project_name: project?.name || null,
      project_color: project?.color || null,
    };
  },

  async create(data, userId = DEFAULT_USER_ID) {
    const { technology_id, project_id, session_date, start_time, end_time, duration_minutes, duration_hours, note } = data;
    const created = await StudySession.create({
      user_id: String(userId),
      technology_id: technology_id ? String(technology_id) : null,
      project_id: project_id ? String(project_id) : null,
      session_date,
      start_time,
      end_time,
      duration_minutes: Number(duration_minutes),
      duration_hours: parseFloat(duration_hours),
      note: note || null,
    });
    return this.findById(created._id, userId);
  },

  async delete(id, userId = DEFAULT_USER_ID) {
    const session = await this.findById(id, userId);
    if (!session) return false;

    const { XpHistory } = await import('./GoalModel.js');
    await XpHistory.deleteMany({ session_id: session.id });

    const result = await StudySession.deleteOne({ _id: session._id });
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

    const matchQuery = {
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
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

    const sessions = await StudySession.find({
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }],
      session_date: { $gte: startDate, $lte: endDate }
    }).sort({ session_date: 1 }).lean();

    const techs = await Technology.find({
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    }).lean();
    const projects = await Project.find({
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    }).lean();

    const techMap = new Map();
    techs.forEach(t => techMap.set(t._id.toString(), t.name));
    projects.forEach(p => techMap.set(p._id.toString(), p.name));

    const dayMap = new Map();
    sessions.forEach(s => {
      const existing = dayMap.get(s.session_date) || {
        session_date: s.session_date,
        hours: 0,
        sessions: 0,
        techSet: new Set(),
      };
      existing.hours += parseFloat(s.duration_hours || 0);
      existing.sessions += 1;
      const techName = s.technology_id ? techMap.get(String(s.technology_id)) : (s.project_id ? techMap.get(String(s.project_id)) : null);
      if (techName) existing.techSet.add(techName);
      dayMap.set(s.session_date, existing);
    });

    return [...dayMap.values()].map(d => ({
      session_date: d.session_date,
      hours: parseFloat(d.hours.toFixed(4)),
      sessions: d.sessions,
      technologies: [...d.techSet].join(', '),
    }));
  },

  async getTechDistribution(userId = DEFAULT_USER_ID) {
    const { Technology } = await import('./TechnologyModel.js');
    const techs = await Technology.find({
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    }).lean();

    const results = [];
    for (const t of techs) {
      const agg = await StudySession.aggregate([
        {
          $match: {
            $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }],
            $and: [{ $or: [{ technology_id: t._id.toString() }, { technology_id: String(t.legacy_id || -1) }] }]
          }
        },
        { $group: { _id: null, total: { $sum: '$duration_hours' } } }
      ]);
      const hours = agg[0]?.total || 0;
      results.push({
        id: t._id.toString(),
        name: t.name,
        color: t.color,
        hours: parseFloat(hours.toFixed(4)),
      });
    }

    return results.sort((a, b) => b.hours - a.hours);
  },

  async getChartData(period, userId = DEFAULT_USER_ID) {
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
        const parts = getAfghanDateParts(row.session_date);
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

    const rows = await StudySession.find({
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    }).lean();

    const years = new Map();
    rows.forEach(row => {
      const { year } = getAfghanDateParts(row.session_date);
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
