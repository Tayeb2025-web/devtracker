import mongoose from 'mongoose';
import { User, UserModel, getDeterministicAvatar } from '../models/UserModel.js';
import { StudySession } from '../models/SessionModel.js';
import { Technology } from '../models/TechnologyModel.js';
import { Project } from '../models/ProjectModel.js';
import { UserFollow } from '../models/SocialModel.js';
import { AppError, asyncHandler } from '../middlewares/errorHandler.js';
import { formatLocalDate, shiftLocalDate, getLocalWeekRange, getLocalMonthStart } from '../utils/date.js';

const MASTER_ADMIN_EMAIL = 'sayedtayebpuya2024@gmail.com';

function resolveAvatar(avatarUrl, seed) {
  if (avatarUrl && avatarUrl !== '/images/profile.jpg') return avatarUrl;
  return getDeterministicAvatar(seed);
}

export const getAdminOverview = asyncHandler(async (req, res) => {
  const now = new Date();
  const today = formatLocalDate(now);
  const yesterday = shiftLocalDate(today, -1);
  const weekRange = getLocalWeekRange(now);
  const monthStart = getLocalMonthStart(now);

  const startOfTodayUtc = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgoUtc = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoUtc = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersToday,
    newUsersWeek,
    newUsersMonth,
    activeTodayUsers,
    active7DaysUsers,
    totalSessions,
    totalTechs,
    totalProjects,
    totalFollows,
    totalHoursAgg,
    todayHoursAgg,
    yesterdayHoursAgg,
    weekHoursAgg,
    monthHoursAgg,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ created_at: { $gte: startOfTodayUtc } }),
    User.countDocuments({ created_at: { $gte: sevenDaysAgoUtc } }),
    User.countDocuments({ created_at: { $gte: thirtyDaysAgoUtc } }),
    User.countDocuments({ $or: [{ last_seen_at: { $gte: startOfTodayUtc } }, { is_studying: true }] }),
    User.countDocuments({ last_seen_at: { $gte: sevenDaysAgoUtc } }),
    StudySession.countDocuments(),
    Technology.countDocuments(),
    Project.countDocuments(),
    UserFollow.countDocuments(),
    StudySession.aggregate([{ $group: { _id: null, total: { $sum: '$duration_hours' } } }]),
    StudySession.aggregate([{ $match: { session_date: today } }, { $group: { _id: null, total: { $sum: '$duration_hours' } } }]),
    StudySession.aggregate([{ $match: { session_date: yesterday } }, { $group: { _id: null, total: { $sum: '$duration_hours' } } }]),
    StudySession.aggregate([{ $match: { session_date: { $gte: weekRange.startDate, $lte: weekRange.endDate } } }, { $group: { _id: null, total: { $sum: '$duration_hours' } } }]),
    StudySession.aggregate([{ $match: { session_date: { $gte: monthStart, $lte: today } } }, { $group: { _id: null, total: { $sum: '$duration_hours' } } }]),
  ]);

  const totalHours = Number((totalHoursAgg[0]?.total || 0).toFixed(1));
  const todayHours = Number((todayHoursAgg[0]?.total || 0).toFixed(1));
  const yesterdayHours = Number((yesterdayHoursAgg[0]?.total || 0).toFixed(1));
  const weekHours = Number((weekHoursAgg[0]?.total || 0).toFixed(1));
  const monthHours = Number((monthHoursAgg[0]?.total || 0).toFixed(1));

  // 14-day study hours trend
  const startDate14 = shiftLocalDate(today, -13);
  const dailySessions = await StudySession.aggregate([
    { $match: { session_date: { $gte: startDate14, $lte: today } } },
    { $group: { _id: '$session_date', hours: { $sum: '$duration_hours' }, sessions: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const sessionMap = new Map(dailySessions.map(item => [item._id, { hours: Number(item.hours.toFixed(1)), sessions: item.sessions }]));
  const studyTrend14 = [];
  for (let i = -13; i <= 0; i++) {
    const d = shiftLocalDate(today, i);
    const found = sessionMap.get(d) || { hours: 0, sessions: 0 };
    studyTrend14.push({ date: d, hours: found.hours, sessions: found.sessions });
  }

  // Top 6 Technologies across platform
  const topTechAgg = await StudySession.aggregate([
    { $match: { technology_id: { $ne: null } } },
    { $group: { _id: '$technology_id', totalHours: { $sum: '$duration_hours' }, sessions: { $sum: 1 }, userIds: { $addToSet: '$user_id' } } },
    { $sort: { totalHours: -1 } },
    { $limit: 6 },
  ]);

  const techIds = topTechAgg.map(t => t._id).filter(Boolean);
  const techDocs = await Technology.find({
    $or: [
      { _id: { $in: techIds.filter(id => mongoose.Types.ObjectId.isValid(String(id))) } },
      { legacy_id: { $in: techIds.map(Number).filter(n => !isNaN(n)) } }
    ]
  }).lean();

  const techMap = new Map();
  techDocs.forEach(t => {
    techMap.set(t._id.toString(), t);
    if (t.legacy_id) techMap.set(String(t.legacy_id), t);
  });

  const popularTechnologies = topTechAgg.map(item => {
    const doc = techMap.get(String(item._id));
    return {
      id: item._id,
      name: doc?.name || `Technology #${item._id}`,
      color: doc?.color || '#6366f1',
      icon: doc?.icon || 'Code',
      totalHours: Number(item.totalHours.toFixed(1)),
      sessions: item.sessions,
      studentsCount: item.userIds.length,
    };
  });

  // Recent 10 live sessions across all users
  const recentSessionsRaw = await StudySession.find()
    .sort({ session_date: -1, created_at: -1 })
    .limit(10)
    .lean();

  const sessionUserIds = [...new Set(recentSessionsRaw.map(s => s.user_id).filter(Boolean))];
  const sessionTechIds = [...new Set(recentSessionsRaw.map(s => s.technology_id).filter(Boolean))];

  const [sessionUsers, sessionTechs] = await Promise.all([
    User.find({
      $or: [
        { _id: { $in: sessionUserIds.filter(id => mongoose.Types.ObjectId.isValid(String(id))) } },
        { legacy_id: { $in: sessionUserIds.map(Number).filter(n => !isNaN(n)) } },
        { username: { $in: sessionUserIds } },
      ]
    }).select('_id legacy_id username display_name avatar_url').lean(),
    Technology.find({
      $or: [
        { _id: { $in: sessionTechIds.filter(id => mongoose.Types.ObjectId.isValid(String(id))) } },
        { legacy_id: { $in: sessionTechIds.map(Number).filter(n => !isNaN(n)) } }
      ]
    }).select('_id legacy_id name color icon').lean(),
  ]);

  const userLookup = new Map();
  sessionUsers.forEach(u => {
    userLookup.set(u._id.toString(), u);
    if (u.legacy_id) userLookup.set(String(u.legacy_id), u);
    if (u.username) userLookup.set(u.username, u);
  });

  const sessionTechLookup = new Map();
  sessionTechs.forEach(t => {
    sessionTechLookup.set(t._id.toString(), t);
    if (t.legacy_id) sessionTechLookup.set(String(t.legacy_id), t);
  });

  const recentActivity = recentSessionsRaw.map(s => {
    const u = userLookup.get(String(s.user_id));
    const t = sessionTechLookup.get(String(s.technology_id));
    return {
      id: s._id.toString(),
      user: {
        id: u?._id?.toString() || s.user_id,
        username: u?.username || 'Unknown',
        display_name: u?.display_name || u?.username || 'User',
        avatar_url: resolveAvatar(u?.avatar_url, u?.username || s.user_id),
      },
      technology: {
        name: t?.name || 'General Study',
        color: t?.color || '#6366f1',
      },
      duration_minutes: s.duration_minutes,
      duration_hours: s.duration_hours,
      session_date: s.session_date,
      start_time: s.start_time,
      end_time: s.end_time,
      note: s.note,
      created_at: s.created_at,
    };
  });

  res.json({
    status: 'success',
    data: {
      metrics: {
        totalUsers,
        newUsersToday,
        newUsersWeek,
        newUsersMonth,
        activeTodayUsers,
        active7DaysUsers,
        totalSessions,
        totalHours,
        todayHours,
        yesterdayHours,
        weekHours,
        monthHours,
        totalTechs,
        totalProjects,
        totalFollows,
      },
      studyTrend14,
      popularTechnologies,
      recentActivity,
    },
  });
});

export const getAdminUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 15));
  const search = (req.query.search || '').trim();
  const filter = req.query.filter || 'all'; // 'all' | 'active_today' | 'admin' | 'user'
  const sortBy = req.query.sortBy || 'created_at';
  const order = req.query.order === 'asc' ? 1 : -1;

  const now = new Date();
  const today = formatLocalDate(now);
  const yesterday = shiftLocalDate(today, -1);
  const weekRange = getLocalWeekRange(now);
  const monthStart = getLocalMonthStart(now);
  const startOfTodayUtc = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const query = {};
  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { display_name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (filter === 'active_today') {
    query.$or = (query.$or || []).concat([
      { last_seen_at: { $gte: startOfTodayUtc } },
      { is_studying: true }
    ]);
  } else if (filter === 'admin') {
    query.role = 'admin';
  } else if (filter === 'user') {
    query.role = { $ne: 'admin' };
  }

  let sortObj = { created_at: -1 };
  if (sortBy === 'last_seen_at') sortObj = { last_seen_at: order };
  else if (sortBy === 'created_at') sortObj = { created_at: order };
  else if (sortBy === 'username') sortObj = { username: order };

  const total = await User.countDocuments(query);
  const usersRaw = await User.find(query)
    .sort(sortObj)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const userIds = [];
  const userAltIds = [];
  usersRaw.forEach(u => {
    userIds.push(u._id.toString());
    if (u.legacy_id) userAltIds.push(String(u.legacy_id));
    if (u.username) userAltIds.push(u.username);
  });
  const allUserMatchIds = [...new Set([...userIds, ...userAltIds])];

  // Aggregate study sessions for these users
  const [userTotalAgg, userTodayAgg, userYesterdayAgg, userWeekAgg, userMonthAgg, followerCountsAgg, followingCountsAgg, topTechAgg] = await Promise.all([
    StudySession.aggregate([
      { $match: { user_id: { $in: allUserMatchIds } } },
      { $group: { _id: '$user_id', totalHours: { $sum: '$duration_hours' }, sessionsCount: { $sum: 1 } } }
    ]),
    StudySession.aggregate([
      { $match: { user_id: { $in: allUserMatchIds }, session_date: today } },
      { $group: { _id: '$user_id', todayHours: { $sum: '$duration_hours' } } }
    ]),
    StudySession.aggregate([
      { $match: { user_id: { $in: allUserMatchIds }, session_date: yesterday } },
      { $group: { _id: '$user_id', yesterdayHours: { $sum: '$duration_hours' } } }
    ]),
    StudySession.aggregate([
      { $match: { user_id: { $in: allUserMatchIds }, session_date: { $gte: weekRange.startDate, $lte: weekRange.endDate } } },
      { $group: { _id: '$user_id', weekHours: { $sum: '$duration_hours' } } }
    ]),
    StudySession.aggregate([
      { $match: { user_id: { $in: allUserMatchIds }, session_date: { $gte: monthStart, $lte: today } } },
      { $group: { _id: '$user_id', monthHours: { $sum: '$duration_hours' } } }
    ]),
    UserFollow.aggregate([
      { $match: { following_id: { $in: allUserMatchIds } } },
      { $group: { _id: '$following_id', count: { $sum: 1 } } }
    ]),
    UserFollow.aggregate([
      { $match: { follower_id: { $in: allUserMatchIds } } },
      { $group: { _id: '$follower_id', count: { $sum: 1 } } }
    ]),
    StudySession.aggregate([
      { $match: { user_id: { $in: allUserMatchIds }, technology_id: { $ne: null } } },
      { $group: { _id: { user_id: '$user_id', tech_id: '$technology_id' }, hours: { $sum: '$duration_hours' } } },
      { $sort: { hours: -1 } }
    ]),
  ]);

  // Build lookups for stats by user identifier
  const totalMap = new Map();
  userTotalAgg.forEach(i => totalMap.set(String(i._id), { hours: Number(i.totalHours.toFixed(1)), count: i.sessionsCount }));

  const todayMap = new Map();
  userTodayAgg.forEach(i => todayMap.set(String(i._id), Number(i.todayHours.toFixed(1))));

  const yesterdayMap = new Map();
  userYesterdayAgg.forEach(i => yesterdayMap.set(String(i._id), Number(i.yesterdayHours.toFixed(1))));

  const weekMap = new Map();
  userWeekAgg.forEach(i => weekMap.set(String(i._id), Number(i.weekHours.toFixed(1))));

  const monthMap = new Map();
  userMonthAgg.forEach(i => monthMap.set(String(i._id), Number(i.monthHours.toFixed(1))));

  const followersMap = new Map();
  followerCountsAgg.forEach(i => followersMap.set(String(i._id), i.count));

  const followingMap = new Map();
  followingCountsAgg.forEach(i => followingMap.set(String(i._id), i.count));

  // Top tech per user
  const topTechIds = [...new Set(topTechAgg.map(t => t._id.tech_id).filter(Boolean))];
  const techNames = await Technology.find({
    $or: [
      { _id: { $in: topTechIds.filter(id => mongoose.Types.ObjectId.isValid(String(id))) } },
      { legacy_id: { $in: topTechIds.map(Number).filter(n => !isNaN(n)) } }
    ]
  }).select('_id legacy_id name color').lean();

  const techLookup = new Map();
  techNames.forEach(t => {
    techLookup.set(t._id.toString(), t);
    if (t.legacy_id) techLookup.set(String(t.legacy_id), t);
  });

  const userTopTech = new Map();
  topTechAgg.forEach(item => {
    const uid = String(item._id.user_id);
    if (!userTopTech.has(uid)) {
      const t = techLookup.get(String(item._id.tech_id));
      userTopTech.set(uid, t ? { name: t.name, color: t.color } : null);
    }
  });

  const users = usersRaw.map(u => {
    const id = u._id.toString();
    const legacyId = u.legacy_id ? String(u.legacy_id) : null;
    const username = u.username;

    const findStat = (map, fallback = 0) => {
      return map.get(id) ?? (legacyId ? map.get(legacyId) : undefined) ?? (username ? map.get(username) : undefined) ?? fallback;
    };

    const totalStat = totalMap.get(id) || (legacyId ? totalMap.get(legacyId) : null) || (username ? totalMap.get(username) : null) || { hours: 0, count: 0 };
    const topTech = userTopTech.get(id) || (legacyId ? userTopTech.get(legacyId) : null) || (username ? userTopTech.get(username) : null) || null;

    return {
      id,
      username: u.username,
      email: u.email || '—',
      display_name: u.display_name || u.username,
      avatar_url: resolveAvatar(u.avatar_url, u.username || id),
      bio: u.bio,
      role: u.role || 'user',
      created_at: u.created_at,
      last_seen_at: u.last_seen_at,
      is_studying: Boolean(u.is_studying),
      active_technology: u.active_technology,
      study_stats: {
        total_hours: totalStat.hours,
        sessions_count: totalStat.count,
        today_hours: findStat(todayMap, 0),
        yesterday_hours: findStat(yesterdayMap, 0),
        week_hours: findStat(weekMap, 0),
        month_hours: findStat(monthMap, 0),
      },
      social: {
        followers_count: findStat(followersMap, 0),
        following_count: findStat(followingMap, 0),
      },
      top_technology: topTech,
    };
  });

  res.json({
    status: 'success',
    data: {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

export const getAdminUserDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await UserModel.findById(id);
  if (!user) throw new AppError('User not found', 404);

  const userId = user.id;
  const userMatchIds = [userId];
  if (user.legacy_id) userMatchIds.push(String(user.legacy_id));
  if (user.username) userMatchIds.push(user.username);

  const now = new Date();
  const today = formatLocalDate(now);
  const yesterday = shiftLocalDate(today, -1);
  const weekRange = getLocalWeekRange(now);
  const monthStart = getLocalMonthStart(now);

  const [
    totalAgg,
    todayAgg,
    yesterdayAgg,
    weekAgg,
    monthAgg,
    techStudyAgg,
    projectStudyAgg,
    dailySessionsAgg,
    followingDocs,
    followerDocs,
    recentSessionsRaw,
  ] = await Promise.all([
    StudySession.aggregate([
      { $match: { user_id: { $in: userMatchIds } } },
      { $group: { _id: null, totalHours: { $sum: '$duration_hours' }, sessionsCount: { $sum: 1 } } }
    ]),
    StudySession.aggregate([
      { $match: { user_id: { $in: userMatchIds }, session_date: today } },
      { $group: { _id: null, total: { $sum: '$duration_hours' } } }
    ]),
    StudySession.aggregate([
      { $match: { user_id: { $in: userMatchIds }, session_date: yesterday } },
      { $group: { _id: null, total: { $sum: '$duration_hours' } } }
    ]),
    StudySession.aggregate([
      { $match: { user_id: { $in: userMatchIds }, session_date: { $gte: weekRange.startDate, $lte: weekRange.endDate } } },
      { $group: { _id: null, total: { $sum: '$duration_hours' } } }
    ]),
    StudySession.aggregate([
      { $match: { user_id: { $in: userMatchIds }, session_date: { $gte: monthStart, $lte: today } } },
      { $group: { _id: null, total: { $sum: '$duration_hours' } } }
    ]),
    // Tech breakdown for this user
    StudySession.aggregate([
      { $match: { user_id: { $in: userMatchIds } } },
      { $group: { _id: '$technology_id', totalHours: { $sum: '$duration_hours' }, sessionsCount: { $sum: 1 } } },
      { $sort: { totalHours: -1 } }
    ]),
    // Project breakdown for this user
    StudySession.aggregate([
      { $match: { user_id: { $in: userMatchIds }, project_id: { $ne: null } } },
      { $group: { _id: '$project_id', totalHours: { $sum: '$duration_hours' }, sessionsCount: { $sum: 1 } } },
      { $sort: { totalHours: -1 } }
    ]),
    // 14-day history for this user
    StudySession.aggregate([
      { $match: { user_id: { $in: userMatchIds }, session_date: { $gte: shiftLocalDate(today, -13), $lte: today } } },
      { $group: { _id: '$session_date', hours: { $sum: '$duration_hours' }, sessions: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    // Who this user follows (following)
    UserFollow.find({ follower_id: { $in: userMatchIds } }).lean(),
    // Who follows this user (followers)
    UserFollow.find({ following_id: { $in: userMatchIds } }).lean(),
    // Recent 30 sessions of this user
    StudySession.find({ user_id: { $in: userMatchIds } })
      .sort({ session_date: -1, created_at: -1 })
      .limit(30)
      .lean(),
  ]);

  const totalHours = Number((totalAgg[0]?.totalHours || 0).toFixed(1));
  const sessionsCount = totalAgg[0]?.sessionsCount || 0;
  const todayHours = Number((todayAgg[0]?.total || 0).toFixed(1));
  const yesterdayHours = Number((yesterdayAgg[0]?.total || 0).toFixed(1));
  const weekHours = Number((weekAgg[0]?.total || 0).toFixed(1));
  const monthHours = Number((monthAgg[0]?.total || 0).toFixed(1));

  // 14-day history formatted
  const dayMap = new Map(dailySessionsAgg.map(d => [d._id, { hours: Number(d.hours.toFixed(1)), sessions: d.sessions }]));
  const studyHistory14 = [];
  for (let i = -13; i <= 0; i++) {
    const d = shiftLocalDate(today, i);
    const found = dayMap.get(d) || { hours: 0, sessions: 0 };
    studyHistory14.push({ date: d, hours: found.hours, sessions: found.sessions });
  }

  // Populate technologies
  const techIds = techStudyAgg.map(t => t._id).filter(Boolean);
  const techDocs = await Technology.find({
    $or: [
      { _id: { $in: techIds.filter(id => mongoose.Types.ObjectId.isValid(String(id))) } },
      { legacy_id: { $in: techIds.map(Number).filter(n => !isNaN(n)) } },
      { user_id: { $in: userMatchIds } }
    ]
  }).lean();

  const techLookup = new Map();
  techDocs.forEach(t => {
    techLookup.set(t._id.toString(), t);
    if (t.legacy_id) techLookup.set(String(t.legacy_id), t);
  });

  const technologies = techStudyAgg.map(item => {
    const doc = techLookup.get(String(item._id));
    const hours = Number(item.totalHours.toFixed(1));
    const percent = totalHours > 0 ? Math.min(100, Math.round((hours / totalHours) * 100)) : 0;
    return {
      id: item._id,
      name: doc?.name || (item._id ? `تکنولوژی #${item._id}` : 'نامشخص'),
      color: doc?.color || '#6366f1',
      icon: doc?.icon || 'Code',
      totalHours: hours,
      sessionsCount: item.sessionsCount,
      percent,
    };
  });

  // Populate projects
  const projIds = projectStudyAgg.map(p => p._id).filter(Boolean);
  const projDocs = await Project.find({
    $or: [
      { _id: { $in: projIds.filter(id => mongoose.Types.ObjectId.isValid(String(id))) } },
      { legacy_id: { $in: projIds.map(Number).filter(n => !isNaN(n)) } }
    ]
  }).lean();

  const projLookup = new Map();
  projDocs.forEach(p => {
    projLookup.set(p._id.toString(), p);
    if (p.legacy_id) projLookup.set(String(p.legacy_id), p);
  });

  const projects = projectStudyAgg.map(item => {
    const doc = projLookup.get(String(item._id));
    const hours = Number(item.totalHours.toFixed(1));
    return {
      id: item._id,
      name: doc?.name || `پروژه #${item._id}`,
      color: doc?.color || '#10b981',
      totalHours: hours,
      sessionsCount: item.sessionsCount,
    };
  });

  // Populate following and followers lists
  const followingUserIds = [...new Set(followingDocs.map(f => f.following_id).filter(Boolean))];
  const followerUserIds = [...new Set(followerDocs.map(f => f.follower_id).filter(Boolean))];
  const allSocialIds = [...new Set([...followingUserIds, ...followerUserIds])];

  const socialUserDocs = await User.find({
    $or: [
      { _id: { $in: allSocialIds.filter(id => mongoose.Types.ObjectId.isValid(String(id))) } },
      { legacy_id: { $in: allSocialIds.map(Number).filter(n => !isNaN(n)) } },
      { username: { $in: allSocialIds } }
    ]
  }).select('_id legacy_id username display_name avatar_url role last_seen_at is_studying active_technology').lean();

  const socialLookup = new Map();
  socialUserDocs.forEach(u => {
    const normalized = {
      id: u._id.toString(),
      username: u.username,
      display_name: u.display_name || u.username,
      avatar_url: resolveAvatar(u.avatar_url, u.username || u._id.toString()),
      role: u.role || 'user',
      last_seen_at: u.last_seen_at,
      is_studying: Boolean(u.is_studying),
      active_technology: u.active_technology,
    };
    socialLookup.set(u._id.toString(), normalized);
    if (u.legacy_id) socialLookup.set(String(u.legacy_id), normalized);
    if (u.username) socialLookup.set(u.username, normalized);
  });

  const following = followingDocs
    .map(f => socialLookup.get(String(f.following_id)))
    .filter(Boolean);

  const followers = followerDocs
    .map(f => socialLookup.get(String(f.follower_id)))
    .filter(Boolean);

  // Format recent sessions
  const recentSessions = recentSessionsRaw.map(s => {
    const t = techLookup.get(String(s.technology_id));
    const p = projLookup.get(String(s.project_id));
    return {
      id: s._id.toString(),
      technology: {
        name: t?.name || '—',
        color: t?.color || '#6366f1',
      },
      project: p ? { name: p.name, color: p.color } : null,
      session_date: s.session_date,
      start_time: s.start_time,
      end_time: s.end_time,
      duration_minutes: s.duration_minutes,
      duration_hours: s.duration_hours,
      note: s.note,
    };
  });

  res.json({
    status: 'success',
    data: {
      profile: {
        id: user.id,
        username: user.username,
        email: user.email || '—',
        display_name: user.display_name || user.username,
        avatar_url: resolveAvatar(user.avatar_url, user.username || user.id),
        bio: user.bio,
        role: user.role || 'user',
        created_at: user.created_at,
        last_seen_at: user.last_seen_at,
        is_studying: Boolean(user.is_studying),
        active_technology: user.active_technology,
        theme: user.theme || 'dark',
        calendar_type: user.calendar_type || 'afghan',
      },
      study_stats: {
        total_hours: totalHours,
        sessions_count: sessionsCount,
        today_hours: todayHours,
        yesterday_hours: yesterdayHours,
        week_hours: weekHours,
        month_hours: monthHours,
      },
      study_history_14: studyHistory14,
      technologies,
      projects,
      social: {
        following_count: following.length,
        followers_count: followers.length,
        following,
        followers,
      },
      recent_sessions: recentSessions,
    },
  });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['user', 'admin'].includes(role)) {
    throw new AppError('Invalid role specified', 400);
  }

  const user = await UserModel.findById(id);
  if (!user) throw new AppError('User not found', 404);

  if (user.email === MASTER_ADMIN_EMAIL && role !== 'admin') {
    throw new AppError('Cannot demote the primary master admin account', 403);
  }

  const updated = await UserModel.update(id, { role });
  res.json({
    status: 'success',
    message: `User role updated to ${role} successfully`,
    data: { user: updated },
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await UserModel.findById(id);
  if (!user) throw new AppError('User not found', 404);

  if (user.email === MASTER_ADMIN_EMAIL) {
    throw new AppError('Cannot delete the primary master admin account', 403);
  }

  const matchIds = [user.id];
  if (user.legacy_id) matchIds.push(String(user.legacy_id));
  if (user.username) matchIds.push(user.username);

  await Promise.all([
    User.findByIdAndDelete(user.id),
    StudySession.deleteMany({ user_id: { $in: matchIds } }),
    Technology.deleteMany({ user_id: { $in: matchIds } }),
    Project.deleteMany({ user_id: { $in: matchIds } }),
    UserFollow.deleteMany({ $or: [{ follower_id: { $in: matchIds } }, { following_id: { $in: matchIds } }] }),
  ]);

  res.json({
    status: 'success',
    message: 'User account and associated data removed successfully',
  });
});

export const scanDatabase = asyncHandler(async (req, res) => {
  const client = mongoose.connection.client;
  const currentDb = mongoose.connection.db;

  const result = {
    databases: [],
    collections: {},
    users: [],
    nextTechnologies: [],
    technologiesWithHours: [],
    distinctSessionUsers: {
      studysessions: [],
      study_sessions: [],
    },
    recentSessions: [],
    nextSessions: [],
  };

  try {
    if (client) {
      const dbs = await client.db().admin().listDatabases();
      result.databases = dbs.databases.map(d => ({ name: d.name, sizeOnDisk: d.sizeOnDisk }));
    }
  } catch (err) {
    result.databaseListError = err.message;
  }

  if (currentDb) {
    try {
      const collections = await currentDb.listCollections().toArray();
      for (const col of collections) {
        const count = await currentDb.collection(col.name).countDocuments();
        result.collections[col.name] = count;
      }
    } catch (err) {
      result.collectionsError = err.message;
    }

    // Inspect users
    try {
      const users = await currentDb.collection('users').find({}).toArray();
      result.users = users.map(u => ({
        id: u._id.toString(),
        username: u.username,
        email: u.email,
        role: u.role,
        legacy_id: u.legacy_id,
        created_at: u.created_at,
      }));
    } catch (err) {
      result.usersError = err.message;
    }

    // Inspect technologies for Next.js and all with hours > 0
    try {
      const allTechs = await currentDb.collection('technologies').find({}).toArray();
      result.nextTechnologies = allTechs.filter(t => /next/i.test(t.name)).map(t => ({
        id: t._id.toString(),
        name: t.name,
        user_id: t.user_id,
        legacy_id: t.legacy_id,
        total_hours: t.total_hours,
        created_at: t.created_at,
      }));
      result.technologiesWithHours = allTechs.filter(t => (t.total_hours || 0) > 0).map(t => ({
        id: t._id.toString(),
        name: t.name,
        user_id: t.user_id,
        legacy_id: t.legacy_id,
        total_hours: t.total_hours,
      }));
    } catch (err) {
      result.techError = err.message;
    }

    // Inspect studysessions
    try {
      const ssCol = currentDb.collection('studysessions');
      const distinctUsers = await ssCol.distinct('user_id');
      for (const uid of distinctUsers) {
        const c = await ssCol.countDocuments({ user_id: uid });
        const sample = await ssCol.findOne({ user_id: uid }, { sort: { session_date: -1 } });
        result.distinctSessionUsers.studysessions.push({ user_id: uid, count: c, latest_date: sample?.session_date });
      }

      const recent = await ssCol.find({ session_date: { $gte: '2026-08-14' } }).toArray();
      result.recentSessions = recent.map(s => ({
        id: s._id.toString(),
        user_id: s.user_id,
        tech_id: s.technology_id,
        session_date: s.session_date,
        duration_hours: s.duration_hours,
        note: s.note,
      }));

      const nextSess = await ssCol.find({ note: { $regex: 'next', $options: 'i' } }).toArray();
      result.nextSessions = nextSess.map(s => ({
        id: s._id.toString(),
        user_id: s.user_id,
        tech_id: s.technology_id,
        session_date: s.session_date,
        duration_hours: s.duration_hours,
        note: s.note,
      }));
    } catch (err) {
      result.studysessionsError = err.message;
    }

    // Inspect study_sessions (snake_case collection)
    try {
      const snakeCol = currentDb.collection('study_sessions');
      const count = await snakeCol.countDocuments();
      if (count > 0) {
        const distinctSnakeUsers = await snakeCol.distinct('user_id');
        for (const uid of distinctSnakeUsers) {
          const c = await snakeCol.countDocuments({ user_id: uid });
          const sample = await snakeCol.findOne({ user_id: uid }, { sort: { session_date: -1 } });
          result.distinctSessionUsers.study_sessions.push({ user_id: uid, count: c, latest_date: sample?.session_date });
        }
      }
    } catch (err) {
      result.snakeSessionsError = err.message;
    }

    // Check all collections across other databases if any
    if (result.databases.length > 0) {
      for (const dbInfo of result.databases) {
        if (dbInfo.name !== 'admin' && dbInfo.name !== 'local' && dbInfo.name !== 'config' && dbInfo.name !== currentDb.databaseName) {
          try {
            const otherDb = client.db(dbInfo.name);
            const otherCols = await otherDb.listCollections().toArray();
            result[`otherDb_${dbInfo.name}`] = {};
            for (const oc of otherCols) {
              const ocCount = await otherDb.collection(oc.name).countDocuments();
              result[`otherDb_${dbInfo.name}`][oc.name] = ocCount;
            }
          } catch (e) {
            result[`otherDb_${dbInfo.name}_error`] = e.message;
          }
        }
      }
    }
  }

  res.json({
    status: 'success',
    data: result,
  });
});

