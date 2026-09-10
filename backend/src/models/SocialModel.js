import mongoose from 'mongoose';
import { AppError } from '../middlewares/errorHandler.js';
import { getLocalWeekRange, shiftLocalDate } from '../utils/date.js';
import { User } from './UserModel.js';
import { Level, Streak, XpHistory } from './GoalModel.js';

const LEAGUE_SIZE = 30;
const DIRECTORY_LIMIT = 24;
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
  async getDirectory(viewerId, { search = '', limit = DIRECTORY_LIMIT } = {}) {
    const normalizedSearch = String(search).trim().slice(0, 80);
    const safeLimit = Math.min(Math.max(Number(limit) || DIRECTORY_LIMIT, 1), 50);

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

    const users = await User.find(query).limit(safeLimit).lean();

    const results = [];
    for (const u of users) {
      const level = await Level.findOne({ user_id: u._id.toString() }).lean();
      const streak = await Streak.findOne({ user_id: u._id.toString() }).lean();
      const followersCount = await UserFollow.countDocuments({ following_id: u._id.toString() });
      const followingCount = await UserFollow.countDocuments({ follower_id: u._id.toString() });
      const isFollowing = await UserFollow.exists({ follower_id: String(viewerId), following_id: u._id.toString() });
      const followsYou = await UserFollow.exists({ follower_id: u._id.toString(), following_id: String(viewerId) });

      results.push({
        id: u._id.toString(),
        username: u.username,
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
        bio: u.bio,
        joinedAt: u.created_at,
        level: Number(level?.current_level || 1),
        totalXp: Number(level?.total_xp || 0),
        currentStreak: Number(streak?.current_streak || 0),
        followersCount: Number(followersCount),
        followingCount: Number(followingCount),
        isFollowing: Boolean(isFollowing),
        followsYou: Boolean(followsYou),
      });
    }

    return results.sort((a, b) => b.totalXp - a.totalXp);
  },

  async getProfile(profileUserId, viewerId) {
    const u = await getUser(profileUserId);
    if (!u || (!u.is_profile_public && u._id.toString() !== String(viewerId))) {
      throw new AppError('Profile not found', 404);
    }

    const level = await Level.findOne({ user_id: u._id.toString() }).lean();
    const streak = await Streak.findOne({ user_id: u._id.toString() }).lean();
    const followersCount = await UserFollow.countDocuments({ following_id: u._id.toString() });
    const followingCount = await UserFollow.countDocuments({ follower_id: u._id.toString() });
    const isFollowing = await UserFollow.exists({ follower_id: String(viewerId), following_id: u._id.toString() });
    const followsYou = await UserFollow.exists({ follower_id: u._id.toString(), following_id: String(viewerId) });

    return {
      id: u._id.toString(),
      username: u.username,
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
      bio: u.bio,
      joinedAt: u.created_at,
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

    const leaderboard = [];
    for (const m of memberships) {
      const u = await User.findById(m.user_id).lean();
      if (!u) continue;

      const level = await Level.findOne({ user_id: u._id.toString() }).lean();
      const streak = await Streak.findOne({ user_id: u._id.toString() }).lean();

      const xpAgg = await XpHistory.aggregate([
        {
          $match: {
            user_id: u._id.toString(),
            created_at: {
              $gte: new Date(league.season_start),
              $lt: new Date(shiftLocalDate(league.season_end, 1))
            }
          }
        },
        { $group: { _id: null, total: { $sum: '$xp_amount' } } }
      ]);
      const weeklyXp = xpAgg[0]?.total || 0;

      leaderboard.push({
        userId: u._id.toString(),
        username: u.username,
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
        level: Number(level?.current_level || 1),
        totalXp: Number(level?.total_xp || 0),
        weeklyXp: Number(weeklyXp),
        currentStreak: Number(streak?.current_streak || 0),
        isCurrentUser: u._id.toString() === String(userId),
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

    const formatted = [];
    for (const msg of messages.reverse()) {
      const sender = await User.findById(msg.sender_id).lean();
      formatted.push({
        id: msg._id.toString(),
        leagueId: league.id,
        body: msg.body,
        createdAt: msg.created_at,
        sender: {
          id: sender ? sender._id.toString() : msg.sender_id,
          username: sender?.username || 'user',
          displayName: sender?.display_name || 'Developer',
          avatarUrl: sender?.avatar_url || null,
        },
      });
    }

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
          avatarUrl: sender?.avatar_url || null,
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

    const results = [];
    for (const c of list) {
      const otherUserId = c.user_low_id === String(userId) ? c.user_high_id : c.user_low_id;
      const otherUser = await User.findById(otherUserId).lean();
      const lastMsg = await DirectMessage.findOne({ conversation_id: c._id.toString() }).sort({ _id: -1 }).lean();
      const unreadCount = await DirectMessage.countDocuments({
        conversation_id: c._id.toString(),
        sender_id: { $ne: String(userId) },
        read_at: null,
      });

      results.push({
        id: c._id.toString(),
        lastMessageAt: c.last_message_at,
        lastMessage: lastMsg?.body || null,
        unreadCount,
        otherUser: {
          id: otherUser ? otherUser._id.toString() : otherUserId,
          username: otherUser?.username || 'user',
          displayName: otherUser?.display_name || 'Developer',
          avatarUrl: otherUser?.avatar_url || null,
        },
      });
    }

    return results;
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
        avatarUrl: otherUser?.avatar_url || null,
      },
    };
  },

  async getMessages(userId, conversationId, { beforeId, limit = MESSAGE_LIMIT } = {}) {
    const conv = await DirectConversation.findById(conversationId).lean();
    if (!conv || (conv.user_low_id !== String(userId) && conv.user_high_id !== String(userId))) {
      throw new AppError('Conversation not found', 404);
    }

    const otherUserId = conv.user_low_id === String(userId) ? conv.user_high_id : conv.user_low_id;
    const otherUser = await User.findById(otherUserId).lean();
    const safeLimit = Math.min(Math.max(Number(limit) || MESSAGE_LIMIT, 1), 100);

    const query = { conversation_id: String(conversationId) };
    if (beforeId) query._id = { $lt: beforeId };

    const messages = await DirectMessage.find(query).sort({ _id: -1 }).limit(safeLimit).lean();

    // Mark as read
    await DirectMessage.updateMany(
      { conversation_id: String(conversationId), sender_id: { $ne: String(userId) }, read_at: null },
      { read_at: new Date() }
    );

    const formatted = [];
    for (const msg of messages.reverse()) {
      const sender = await User.findById(msg.sender_id).lean();
      formatted.push({
        id: msg._id.toString(),
        conversationId: String(conversationId),
        body: msg.body,
        createdAt: msg.created_at,
        sender: {
          id: sender ? sender._id.toString() : msg.sender_id,
          username: sender?.username || 'user',
          displayName: sender?.display_name || 'Developer',
          avatarUrl: sender?.avatar_url || null,
        },
      });
    }

    return {
      conversation: {
        id: conv._id.toString(),
        otherUser: {
          id: otherUser ? otherUser._id.toString() : otherUserId,
          username: otherUser?.username || 'user',
          displayName: otherUser?.display_name || 'Developer',
          avatarUrl: otherUser?.avatar_url || null,
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
          avatarUrl: sender?.avatar_url || null,
        },
      },
      recipientId: otherUserId,
    };
  },
};
