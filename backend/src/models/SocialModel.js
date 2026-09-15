import mongoose from 'mongoose';
import { AppError } from '../middlewares/errorHandler.js';
import { getLocalWeekRange, shiftLocalDate } from '../utils/date.js';
import { User, getDeterministicAvatar } from './UserModel.js';
import { Level, Streak, XpHistory } from './GoalModel.js';

function resolveUserAvatar(url, seed) {
  if (url && url !== '/images/profile.jpg') return url;
  return getDeterministicAvatar(seed);
}

const LEAGUE_SIZE = 30;
const DIRECTORY_LIMIT = 12;
const MESSAGE_LIMIT = 50;

// User Follow Schema
const UserFollowSchema = new mongoose.Schema({
  follower_id: { type: String, required: true, index: true },
  following_id: { type: String, required: true, index: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
UserFollowSchema.index({ follower_id: 1, following_id: 1 }, { unique: true });
export const UserFollow = mongoose.models.UserFollow || mongoose.model('UserFollow', UserFollowSchema);

// Competitive League Schema
const CompetitiveLeagueSchema = new mongoose.Schema({
  season_start: { type: String, required: true },
  season_end: { type: String, required: true },
  tier: { type: String, enum: ['Bronze', 'Silver', 'Gold', 'Diamond'], default: 'Bronze' },
  group_number: { type: Number, required: true },
  max_members: { type: Number, default: 30 },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
CompetitiveLeagueSchema.index({ season_start: 1, tier: 1, group_number: 1 }, { unique: true });
export const CompetitiveLeague = mongoose.models.CompetitiveLeague || mongoose.model('CompetitiveLeague', CompetitiveLeagueSchema);

// League Membership Schema
const LeagueMembershipSchema = new mongoose.Schema({
  league_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true, index: true },
  season_start: { type: String, required: true },
}, { timestamps: { createdAt: 'joined_at', updatedAt: false } });
LeagueMembershipSchema.index({ user_id: 1, season_start: 1 }, { unique: true });
export const LeagueMembership = mongoose.models.LeagueMembership || mongoose.model('LeagueMembership', LeagueMembershipSchema);

// League Message Schema
const LeagueMessageSchema = new mongoose.Schema({
  league_id: { type: String, required: true, index: true },
  sender_id: { type: String, required: true, index: true },
  body: { type: String, required: true, maxlength: 1000 },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
export const LeagueMessage = mongoose.models.LeagueMessage || mongoose.model('LeagueMessage', LeagueMessageSchema);

// Direct Conversation Schema
const DirectConversationSchema = new mongoose.Schema({
  user_low_id: { type: String, required: true, index: true },
  user_high_id: { type: String, required: true, index: true },
  last_message_at: { type: Date, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
DirectConversationSchema.index({ user_low_id: 1, user_high_id: 1 }, { unique: true });
export const DirectConversation = mongoose.models.DirectConversation || mongoose.model('DirectConversation', DirectConversationSchema);

// Direct Message Schema
const DirectMessageSchema = new mongoose.Schema({
  conversation_id: { type: String, required: true, index: true },
  sender_id: { type: String, required: true, index: true },
  body: { type: String, required: true, maxlength: 1000 },
  read_at: { type: Date, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
export const DirectMessage = mongoose.models.DirectMessage || mongoose.model('DirectMessage', DirectMessageSchema);

const cleanMessage = (body) => String(body || '').trim().replace(/\s+/g, ' ');

async function getUser(userId) {
  return User.findById(userId).lean() || User.findOne({ legacy_id: Number(userId) || -1 }).lean();
}

export const SocialModel = {
  async getDirectory(viewerId, { search = '', page = 1, limit = DIRECTORY_LIMIT } = {}) {
    const normalizedSearch = String(search).trim().slice(0, 80);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(Math.max(Number(limit) || DIRECTORY_LIMIT, 1), 50);
    const skip = (pageNum - 1) * safeLimit;

    const query = {
      _id: { $ne: viewerId },
      is_profile_public: true,
    };
    if (normalizedSearch) {
      query.$or = [
        { display_name: { $regex: normalizedSearch, $options: 'i' } },
        { username: { $regex: normalizedSearch, $options: 'i' } },
      ];
    }

    const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

    const [totalUsers, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .sort({ last_seen_at: -1, created_at: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
    ]);

    if (!users.length) {
      return {
        profiles: [],
        pagination: {
          page: pageNum,
          limit: safeLimit,
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / safeLimit) || 1,
          hasMore: false,
        },
      };
    }

    const userIds = users.map(u => u._id.toString());

    // Batch fetch all levels, streaks, followers count, following count, and viewer follow status in parallel
    const [levels, streaks, followersAgg, followingAgg, viewerFollowing, viewerFollowers] = await Promise.all([
      Level.find({ user_id: { $in: userIds } }).lean(),
      Streak.find({ user_id: { $in: userIds } }).lean(),
      UserFollow.aggregate([
        { $match: { following_id: { $in: userIds } } },
        { $group: { _id: '$following_id', count: { $sum: 1 } } }
      ]),
      UserFollow.aggregate([
        { $match: { follower_id: { $in: userIds } } },
        { $group: { _id: '$follower_id', count: { $sum: 1 } } }
      ]),
      UserFollow.find({ follower_id: String(viewerId), following_id: { $in: userIds } }).select('following_id').lean(),
      UserFollow.find({ follower_id: { $in: userIds }, following_id: String(viewerId) }).select('follower_id').lean(),
    ]);

    const levelMap = new Map(levels.map(l => [String(l.user_id), l]));
    const streakMap = new Map(streaks.map(s => [String(s.user_id), s]));
    const followersMap = new Map(followersAgg.map(f => [String(f._id), f.count]));
    const followingMap = new Map(followingAgg.map(f => [String(f._id), f.count]));
    const followingSet = new Set(viewerFollowing.map(f => String(f.following_id)));
    const followersSet = new Set(viewerFollowers.map(f => String(f.follower_id)));

    const now = Date.now();
    const results = users.map(u => {
      const uid = u._id.toString();
      const level = levelMap.get(uid);
      const streak = streakMap.get(uid);
      const isOnline = Boolean(u.last_seen_at && (now - new Date(u.last_seen_at).getTime()) <= ONLINE_THRESHOLD_MS);
      const isStudying = Boolean(isOnline && u.is_studying);

      return {
        id: uid,
        username: u.username,
        displayName: u.display_name,
        avatarUrl: resolveUserAvatar(u.avatar_url, u.username || uid),
        bio: u.bio,
        joinedAt: u.created_at,
        lastSeenAt: u.last_seen_at || u.created_at,
        isOnline,
        isStudying,
        activeTechnology: u.active_technology,
        level: Number(level?.current_level || 1),
        totalXp: Number(level?.total_xp || 0),
        currentStreak: Number(streak?.current_streak || 0),
        followersCount: Number(followersMap.get(uid) || 0),
        followingCount: Number(followingMap.get(uid) || 0),
        isFollowing: followingSet.has(uid),
        followsYou: followersSet.has(uid),
      };
    });

    results.sort((a, b) => {
      // 1. Current online users have highest priority
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;

      // 2. If both are currently online, prioritize studying members
      if (a.isOnline && b.isOnline && a.isStudying !== b.isStudying) {
        return a.isStudying ? -1 : 1;
      }

      // 3. Order by who was online most recently (latest lastSeenAt)
      const timeA = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
      const timeB = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;

      // 4. Secondary tie-breaker: total XP
      return b.totalXp - a.totalXp;
    });

    const totalPages = Math.ceil(totalUsers / safeLimit) || 1;

    return {
      profiles: results,
      pagination: {
        page: pageNum,
        limit: safeLimit,
        total: totalUsers,
        totalPages,
        hasMore: pageNum < totalPages,
      },
    };
  },

  async getProfile(profileUserId, viewerId) {
    const u = await getUser(profileUserId);
    if (!u || (!u.is_profile_public && u._id.toString() !== String(viewerId))) {
      throw new AppError('Profile not found', 404);
    }

    const uid = u._id.toString();
    const [level, streak, followersCount, followingCount, isFollowing, followsYou] = await Promise.all([
      Level.findOne({ user_id: uid }).lean(),
      Streak.findOne({ user_id: uid }).lean(),
      UserFollow.countDocuments({ following_id: uid }),
      UserFollow.countDocuments({ follower_id: uid }),
      UserFollow.exists({ follower_id: String(viewerId), following_id: uid }),
      UserFollow.exists({ follower_id: uid, following_id: String(viewerId) }),
    ]);

    const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
    const isOnline = Boolean(u.last_seen_at && (Date.now() - new Date(u.last_seen_at).getTime()) <= ONLINE_THRESHOLD_MS);
    const isStudying = Boolean(isOnline && u.is_studying);

    return {
      id: uid,
      username: u.username,
      displayName: u.display_name,
      avatarUrl: resolveUserAvatar(u.avatar_url, u.username || uid),
      bio: u.bio,
      joinedAt: u.created_at,
      lastSeenAt: u.last_seen_at || u.created_at,
      isOnline,
      isStudying,
      activeTechnology: u.active_technology,
      level: Number(level?.current_level || 1),
      totalXp: Number(level?.total_xp || 0),
      currentStreak: Number(streak?.current_streak || 0),
      followersCount: Number(followersCount),
      followingCount: Number(followingCount),
      isFollowing: Boolean(isFollowing),
      followsYou: Boolean(followsYou),
    };
  },

  async follow(followerId, followingId) {
    if (String(followerId) === String(followingId)) throw new AppError('You cannot follow yourself', 400);
    const target = await getUser(followingId);
    if (!target || !target.is_profile_public) throw new AppError('Profile not found', 404);

    await UserFollow.updateOne(
      { follower_id: String(followerId), following_id: target._id.toString() },
      { $setOnInsert: { follower_id: String(followerId), following_id: target._id.toString() } },
      { upsert: true }
    );
    return this.getProfile(followingId, followerId);
  },

  async unfollow(followerId, followingId) {
    const target = await getUser(followingId);
    if (target) {
      await UserFollow.deleteOne({ follower_id: String(followerId), following_id: target._id.toString() });
    }
    return this.getProfile(followingId, followerId);
  },

  async updatePresence(userId, data = {}) {
    const update = {
      last_seen_at: new Date(),
    };
    if (data.is_studying !== undefined) {
      update.is_studying = Boolean(data.is_studying);
    }
    if (data.technology_name !== undefined) {
      update.active_technology = data.technology_name ? String(data.technology_name).trim().slice(0, 50) : null;
    }
    if (data.today_hours !== undefined) {
      const h = Number(data.today_hours);
      if (Number.isFinite(h) && h >= 0) {
        update.today_study_hours = Math.round(h * 10) / 10;
      }
    }

    await User.updateOne({ _id: userId }, { $set: update });
    return { ok: true, timestamp: update.last_seen_at };
  },

  async getLiveActivities(viewerId) {
    const viewer = await User.findById(viewerId).lean();
    if (!viewer) return [];

    // 1. Fetch viewer relationships
    const [viewerFollowing, viewerFollowers] = await Promise.all([
      UserFollow.find({ follower_id: String(viewerId) }).select('following_id').lean(),
      UserFollow.find({ following_id: String(viewerId) }).select('follower_id').lean(),
    ]);

    const followingIds = new Set(viewerFollowing.map(f => String(f.following_id)));
    const followerIds = new Set(viewerFollowers.map(f => String(f.follower_id)));

    const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
    const now = Date.now();

    // 2. Query public candidates
    const candidates = await User.find({
      _id: { $ne: viewerId },
      is_profile_public: true,
    })
      .select('_id username display_name avatar_url last_seen_at is_studying active_technology today_study_hours created_at')
      .lean();

    if (!candidates || candidates.length === 0) return [];

    const candidateIds = candidates.map(c => c._id.toString());
    const [streaks, levels] = await Promise.all([
      Streak.find({ user_id: { $in: candidateIds } }).lean(),
      Level.find({ user_id: { $in: candidateIds } }).lean(),
    ]);

    const streakMap = new Map(streaks.map(s => [String(s.user_id), s]));
    const levelMap = new Map(levels.map(l => [String(l.user_id), l]));

    // Format relative time helper for Persian
    const formatTimeFa = (date) => {
      if (!date) return 'مدتی پیش';
      const diffMs = now - new Date(date).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'هم‌اکنون';
      if (diffMins < 60) return `${diffMins} دقیقه پیش`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} ساعت پیش`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'دیروز';
      if (diffDays < 7) return `${diffDays} روز پیش`;
      return `${Math.floor(diffDays / 7)} هفته پیش`;
    };

    // 3. Score candidates and compose strictly truthful messages
    const processed = candidates.map(u => {
      const uid = u._id.toString();
      const isFollowing = followingIds.has(uid);
      const isFollower = followerIds.has(uid);
      const isMutual = isFollowing && isFollower;

      const lastSeenMs = u.last_seen_at ? new Date(u.last_seen_at).getTime() : 0;
      const isOnline = Boolean(lastSeenMs && (now - lastSeenMs) <= ONLINE_THRESHOLD_MS);
      const isStudying = Boolean(isOnline && u.is_studying);

      const streak = Number(streakMap.get(uid)?.current_streak || 0);
      const level = Number(levelMap.get(uid)?.current_level || 1);
      const todayHours = Number(u.today_study_hours || 0);
      const name = u.display_name || u.username;
      const tech = u.active_technology;

      // Calculate priority score:
      // - Mutual follows: +2000
      // - User follows them: +1200
      // - They follow user: +600
      // - Currently studying: +800
      // - Currently online: +400
      // - Studied today: +200
      let score = 0;
      if (isMutual) score += 2000;
      else if (isFollowing) score += 1200;
      else if (isFollower) score += 600;

      if (isStudying) score += 800;
      else if (isOnline) score += 400;

      if (todayHours > 0) score += 200 + Math.min(todayHours * 10, 100);
      if (streak >= 3) score += 100;

      // Recency bonus: active in past 24 hours gets a slight boost
      if (lastSeenMs) {
        const hoursAgo = (now - lastSeenMs) / (3600 * 1000);
        if (hoursAgo < 24) {
          score += Math.max(0, Math.round((24 - hoursAgo) * 5));
        }
      }

      // Generate 100% TRUTHFUL Persian message
      let message = '';
      let statusType = 'offline';

      if (isStudying) {
        statusType = 'studying';
        if (tech) {
          message = `در حال کدنویسی با ${tech} است 💻🔥`;
        } else {
          message = `در حال کدنویسی و تمرکز است 💻🔥`;
        }
      } else if (isOnline) {
        statusType = 'online';
        message = `هم‌اکنون آنلاین در پلتفرم است ✨`;
      } else {
        // Strictly offline: state actual historical achievements or last seen time, NEVER claim online
        statusType = 'offline';
        if (todayHours >= 1) {
          const displayHours = todayHours % 1 === 0 ? todayHours : todayHours.toFixed(1);
          message = `امروز ${displayHours} ساعت مطالعه داشته 📚`;
        } else if (todayHours > 0) {
          const mins = Math.round(todayHours * 60);
          message = `امروز ${mins} دقیقه مطالعه داشته 📚`;
        } else if (streak >= 2) {
          message = `رکورد استریک ${streak} روزه دارد 🔥`;
        } else if (level >= 2) {
          message = `به سطح ${level} رسیده است 🌟`;
        } else {
          message = `آخرین فعالیت: ${formatTimeFa(u.last_seen_at || u.created_at)} 🕒`;
        }
      }

      return {
        id: uid,
        userId: uid,
        username: u.username,
        displayName: name,
        avatarUrl: resolveUserAvatar(u.avatar_url, u.username || uid),
        isOnline,
        isStudying,
        technology: tech,
        isMutual,
        isFollowing,
        followsYou: isFollower,
        statusType,
        message,
        streak,
        level,
        todayHours,
        lastSeenAt: u.last_seen_at || u.created_at,
        score,
      };
    });

    // Sort by score descending (highest priority first)
    processed.sort((a, b) => b.score - a.score);

    // Return the top 3 candidates
    return processed.slice(0, 3);
  },
};

export const LeagueModel = {
  async getCurrentMembership(userId) {
    const { startDate } = getLocalWeekRange();
    const seasonEnd = shiftLocalDate(startDate, 6);

    let membership = await LeagueMembership.findOne({
      user_id: String(userId),
      season_start: startDate
    }).lean();

    if (membership) {
      const league = await CompetitiveLeague.findById(membership.league_id).lean();
      return { ...league, id: league._id.toString(), joined_at: membership.joined_at };
    }

    const count = await LeagueMembership.countDocuments({ season_start: startDate });
    const groupNumber = Math.floor(count / LEAGUE_SIZE) + 1;

    let league = await CompetitiveLeague.findOne({
      season_start: startDate,
      tier: 'Bronze',
      group_number: groupNumber
    });

    if (!league) {
      league = await CompetitiveLeague.create({
        season_start: startDate,
        season_end: seasonEnd,
        tier: 'Bronze',
        group_number: groupNumber,
        max_members: LEAGUE_SIZE,
      });
    }

    await LeagueMembership.create({
      league_id: league._id.toString(),
      user_id: String(userId),
      season_start: startDate,
    });

    return { ...league.toJSON(), id: league._id.toString(), joined_at: new Date() };
  },

  async isMember(leagueId, userId) {
    return Boolean(await LeagueMembership.exists({ league_id: String(leagueId), user_id: String(userId) }));
  },

  async getLeaderboard(userId) {
    const league = await this.getCurrentMembership(userId);
    const memberships = await LeagueMembership.find({ league_id: league.id }).lean();

    if (!memberships.length) {
      return {
        league: {
          id: league.id,
          tier: league.tier,
          groupNumber: league.group_number,
          seasonStart: league.season_start,
          seasonEnd: league.season_end,
          maxMembers: league.max_members,
        },
        leaderboard: [],
      };
    }

    const memberUserIds = memberships.map(m => String(m.user_id));
    const seasonStartDate = new Date(league.season_start);
    const seasonEndDate = new Date(shiftLocalDate(league.season_end, 1));

    const [users, levels, streaks, xpAggs] = await Promise.all([
      User.find({ _id: { $in: memberUserIds } }).lean(),
      Level.find({ user_id: { $in: memberUserIds } }).lean(),
      Streak.find({ user_id: { $in: memberUserIds } }).lean(),
      XpHistory.aggregate([
        {
          $match: {
            user_id: { $in: memberUserIds },
            created_at: {
              $gte: seasonStartDate,
              $lt: seasonEndDate,
            },
          },
        },
        { $group: { _id: '$user_id', total: { $sum: '$xp_amount' } } },
      ]),
    ]);

    const userMap = new Map(users.map(u => [u._id.toString(), u]));
    const levelMap = new Map(levels.map(l => [String(l.user_id), l]));
    const streakMap = new Map(streaks.map(s => [String(s.user_id), s]));
    const xpMap = new Map(xpAggs.map(x => [String(x._id), x.total]));

    const leaderboard = [];
    for (const m of memberships) {
      const u = userMap.get(String(m.user_id));
      if (!u) continue;

      const uid = u._id.toString();
      const level = levelMap.get(uid);
      const streak = streakMap.get(uid);
      const weeklyXp = xpMap.get(uid) || 0;

      const isOnline = Boolean(u.last_seen_at && (Date.now() - new Date(u.last_seen_at).getTime()) <= 5 * 60 * 1000);

      leaderboard.push({
        userId: uid,
        username: u.username,
        displayName: u.display_name,
        avatarUrl: resolveUserAvatar(u.avatar_url, u.username || uid),
        isOnline,
        level: Number(level?.current_level || 1),
        totalXp: Number(level?.total_xp || 0),
        weeklyXp: Number(weeklyXp),
        currentStreak: Number(streak?.current_streak || 0),
        isCurrentUser: uid === String(userId),
      });
    }

    leaderboard.sort((a, b) => b.weeklyXp - a.weeklyXp || b.currentStreak - a.currentStreak);
    leaderboard.forEach((item, index) => { item.rank = index + 1; });

    return {
      league: {
        id: league.id,
        tier: league.tier,
        groupNumber: league.group_number,
        seasonStart: league.season_start,
        seasonEnd: league.season_end,
        maxMembers: league.max_members,
      },
      leaderboard,
    };
  },

  async getMessages(userId, { beforeId, limit = MESSAGE_LIMIT } = {}) {
    const league = await this.getCurrentMembership(userId);
    const safeLimit = Math.min(Math.max(Number(limit) || MESSAGE_LIMIT, 1), 100);

    const query = { league_id: league.id };
    if (beforeId) {
      query._id = { $lt: beforeId };
    }

    const messages = await LeagueMessage.find(query).sort({ _id: -1 }).limit(safeLimit).lean();

    const senderIds = [...new Set(messages.map(m => m.sender_id))];
    const senders = await User.find({ _id: { $in: senderIds } }).lean();
    const senderMap = new Map(senders.map(s => [s._id.toString(), s]));

    const formatted = messages.reverse().map(msg => {
      const sender = senderMap.get(String(msg.sender_id));
      return {
        id: msg._id.toString(),
        leagueId: league.id,
        body: msg.body,
        createdAt: msg.created_at,
        sender: {
          id: sender ? sender._id.toString() : msg.sender_id,
          username: sender?.username || 'user',
          displayName: sender?.display_name || 'Developer',
          avatarUrl: resolveUserAvatar(sender?.avatar_url, sender?.username || msg.sender_id),
        },
      };
    });

    return { leagueId: league.id, messages: formatted };
  },

  async sendMessage(userId, body) {
    const messageBody = cleanMessage(body);
    if (!messageBody) throw new AppError('Message cannot be empty', 400);
    if (messageBody.length > 1000) throw new AppError('Message must be 1000 characters or less', 400);

    const league = await this.getCurrentMembership(userId);
    const msg = await LeagueMessage.create({
      league_id: league.id,
      sender_id: String(userId),
      body: messageBody,
    });

    const sender = await User.findById(userId).lean();
    return {
      leagueId: league.id,
      message: {
        id: msg._id.toString(),
        leagueId: league.id,
        body: msg.body,
        createdAt: msg.created_at,
        sender: {
          id: sender ? sender._id.toString() : String(userId),
          username: sender?.username || 'user',
          displayName: sender?.display_name || 'Developer',
          avatarUrl: resolveUserAvatar(sender?.avatar_url, sender?.username || String(userId)),
        },
      },
    };
  },
};

export const ChatModel = {
  async getConversations(userId) {
    const list = await DirectConversation.find({
      $or: [{ user_low_id: String(userId) }, { user_high_id: String(userId) }]
    }).sort({ last_message_at: -1, _id: -1 }).lean();

    if (!list.length) return [];

    const otherUserIds = list.map(c => c.user_low_id === String(userId) ? c.user_high_id : c.user_low_id);
    const convIds = list.map(c => c._id.toString());

    const [otherUsers, unreadAggs, lastMessages] = await Promise.all([
      User.find({ _id: { $in: otherUserIds } }).lean(),
      DirectMessage.aggregate([
        {
          $match: {
            conversation_id: { $in: convIds },
            sender_id: { $ne: String(userId) },
            read_at: null,
          }
        },
        { $group: { _id: '$conversation_id', count: { $sum: 1 } } }
      ]),
      Promise.all(list.map(c => DirectMessage.findOne({ conversation_id: c._id.toString() }).sort({ _id: -1 }).lean()))
    ]);

    const otherUserMap = new Map(otherUsers.map(u => [u._id.toString(), u]));
    const unreadMap = new Map(unreadAggs.map(u => [String(u._id), u.count]));
    const lastMsgMap = new Map(list.map((c, idx) => [c._id.toString(), lastMessages[idx]?.body || null]));

    return list.map(c => {
      const cid = c._id.toString();
      const otherUserId = c.user_low_id === String(userId) ? c.user_high_id : c.user_low_id;
      const otherUser = otherUserMap.get(String(otherUserId));

      return {
        id: cid,
        lastMessageAt: c.last_message_at,
        lastMessage: lastMsgMap.get(cid) || null,
        unreadCount: unreadMap.get(cid) || 0,
        otherUser: {
          id: otherUser ? otherUser._id.toString() : otherUserId,
          username: otherUser?.username || 'user',
          displayName: otherUser?.display_name || 'Developer',
          avatarUrl: resolveUserAvatar(otherUser?.avatar_url, otherUser?.username || otherUserId),
          isOnline: Boolean(otherUser?.last_seen_at && (Date.now() - new Date(otherUser.last_seen_at).getTime()) <= 5 * 60 * 1000),
        },
      };
    });
  },

  async createConversation(userId, recipientId) {
    if (String(userId) === String(recipientId)) throw new AppError('You cannot message yourself', 400);
    const [lowId, highId] = [String(userId), String(recipientId)].sort();

    let conv = await DirectConversation.findOne({ user_low_id: lowId, user_high_id: highId });
    if (!conv) {
      conv = await DirectConversation.create({ user_low_id: lowId, user_high_id: highId });
    }

    const otherUser = await User.findById(recipientId).lean();
    return {
      id: conv._id.toString(),
      otherUser: {
        id: otherUser ? otherUser._id.toString() : recipientId,
        username: otherUser?.username || 'user',
        displayName: otherUser?.display_name || 'Developer',
        avatarUrl: resolveUserAvatar(otherUser?.avatar_url, otherUser?.username || recipientId),
      },
    };
  },

  async getMessages(userId, conversationId, { beforeId, limit = MESSAGE_LIMIT } = {}) {
    const conv = await DirectConversation.findById(conversationId).lean();
    if (!conv || (conv.user_low_id !== String(userId) && conv.user_high_id !== String(userId))) {
      throw new AppError('Conversation not found', 404);
    }

    const otherUserId = conv.user_low_id === String(userId) ? conv.user_high_id : conv.user_low_id;
    const safeLimit = Math.min(Math.max(Number(limit) || MESSAGE_LIMIT, 1), 100);

    const query = { conversation_id: String(conversationId) };
    if (beforeId) query._id = { $lt: beforeId };

    const [otherUser, messages] = await Promise.all([
      User.findById(otherUserId).lean(),
      DirectMessage.find(query).sort({ _id: -1 }).limit(safeLimit).lean(),
    ]);

    // Mark as read in background without blocking
    DirectMessage.updateMany(
      { conversation_id: String(conversationId), sender_id: { $ne: String(userId) }, read_at: null },
      { read_at: new Date() }
    ).catch(() => {});

    const senderIds = [...new Set(messages.map(m => m.sender_id))];
    const senders = await User.find({ _id: { $in: senderIds } }).lean();
    const senderMap = new Map(senders.map(s => [s._id.toString(), s]));

    const formatted = messages.reverse().map(msg => {
      const sender = senderMap.get(String(msg.sender_id));
      return {
        id: msg._id.toString(),
        conversationId: String(conversationId),
        body: msg.body,
        createdAt: msg.created_at,
        sender: {
          id: sender ? sender._id.toString() : msg.sender_id,
          username: sender?.username || 'user',
          displayName: sender?.display_name || 'Developer',
          avatarUrl: resolveUserAvatar(sender?.avatar_url, sender?.username || msg.sender_id),
        },
      };
    });

    return {
      conversation: {
        id: conv._id.toString(),
        otherUser: {
          id: otherUser ? otherUser._id.toString() : otherUserId,
          username: otherUser?.username || 'user',
          displayName: otherUser?.display_name || 'Developer',
          avatarUrl: resolveUserAvatar(otherUser?.avatar_url, otherUser?.username || otherUserId),
        },
      },
      messages: formatted,
    };
  },

  async sendMessage(userId, conversationId, body) {
    const conv = await DirectConversation.findById(conversationId);
    if (!conv || (conv.user_low_id !== String(userId) && conv.user_high_id !== String(userId))) {
      throw new AppError('Conversation not found', 404);
    }

    const messageBody = cleanMessage(body);
    if (!messageBody) throw new AppError('Message cannot be empty', 400);

    const otherUserId = conv.user_low_id === String(userId) ? conv.user_high_id : conv.user_low_id;
    const msg = await DirectMessage.create({
      conversation_id: String(conversationId),
      sender_id: String(userId),
      body: messageBody,
    });

    conv.last_message_at = new Date();
    await conv.save();

    const sender = await User.findById(userId).lean();
    return {
      message: {
        id: msg._id.toString(),
        conversationId: String(conversationId),
        body: msg.body,
        createdAt: msg.created_at,
        sender: {
          id: sender ? sender._id.toString() : String(userId),
          username: sender?.username || 'user',
          displayName: sender?.display_name || 'Developer',
          avatarUrl: resolveUserAvatar(sender?.avatar_url, sender?.username || String(userId)),
        },
      },
      recipientId: otherUserId,
    };
  },
};
