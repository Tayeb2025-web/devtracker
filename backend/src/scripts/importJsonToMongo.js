import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://devtracker_user:HQz9dZ2yv7bcVsZl@cluster0.9xfi3bk.mongodb.net/devtracker?retryWrites=true&w=majority&appName=Cluster0';

async function importToMongo() {
  console.log('🚀 Starting import from JSON backup to MongoDB Atlas...');

  const backupFile = path.resolve('./devtracker_mysql_backup.json');
  if (!fs.existsSync(backupFile)) {
    throw new Error('Backup file not found: ' + backupFile);
  }

  const raw = fs.readFileSync(backupFile, 'utf-8');
  const { data } = JSON.parse(raw);

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 25000,
    connectTimeoutMS: 25000,
  });
  console.log('✅ Connected to MongoDB Atlas.');

  const db = mongoose.connection.db;

  const userMap = new Map();
  const categoryMap = new Map();
  const techMap = new Map();
  const projectMap = new Map();
  const sessionMap = new Map();

  // 1. Users
  const users = data.users || [];
  console.log(`👤 Importing ${users.length} users...`);
  const userCollection = db.collection('users');
  await userCollection.deleteMany({});
  for (const u of users) {
    const mongoId = new mongoose.Types.ObjectId();
    userMap.set(Number(u.id), mongoId.toString());
    await userCollection.insertOne({
      _id: mongoId,
      legacy_id: Number(u.id),
      username: u.username,
      email: u.email,
      password_hash: u.password_hash,
      display_name: u.display_name || 'Developer',
      avatar_url: u.avatar_url || '/images/profile.jpg',
      bio: u.bio,
      is_profile_public: Boolean(u.is_profile_public),
      allow_direct_messages: u.allow_direct_messages || 'followers',
      theme: u.theme || 'dark',
      notification_enabled: Boolean(u.notification_enabled),
      notification_time: u.notification_time || '09:00:00',
      created_at: u.created_at ? new Date(u.created_at) : new Date(),
      updated_at: u.updated_at ? new Date(u.updated_at) : new Date(),
    });
  }

  // 2. Categories
  const categories = data.technology_categories || [];
  console.log(`📁 Importing ${categories.length} technology categories...`);
  const categoryCollection = db.collection('technology_categories');
  await categoryCollection.deleteMany({});
  for (const c of categories) {
    const mongoId = new mongoose.Types.ObjectId();
    categoryMap.set(Number(c.id), mongoId.toString());
    const userId = userMap.get(Number(c.user_id)) || String(c.user_id);
    await categoryCollection.insertOne({
      _id: mongoId,
      legacy_id: Number(c.id),
      user_id: String(userId),
      name: c.name,
      color: c.color || '#3B82F6',
      sort_order: Number(c.sort_order || 0),
      created_at: c.created_at ? new Date(c.created_at) : new Date(),
      updated_at: c.updated_at ? new Date(c.updated_at) : new Date(),
    });
  }

  // 3. Technologies
  const technologies = data.technologies || [];
  console.log(`⚡ Importing ${technologies.length} technologies...`);
  const techCollection = db.collection('technologies');
  await techCollection.deleteMany({});
  for (const t of technologies) {
    const mongoId = new mongoose.Types.ObjectId();
    techMap.set(Number(t.id), mongoId.toString());
    const userId = userMap.get(Number(t.user_id)) || String(t.user_id);
    const categoryId = t.category_id ? (categoryMap.get(Number(t.category_id)) || null) : null;
    await techCollection.insertOne({
      _id: mongoId,
      legacy_id: Number(t.id),
      user_id: String(userId),
      name: t.name,
      color: t.color || '#3B82F6',
      icon: t.icon || 'code',
      custom_icon: t.custom_icon || null,
      category_id: categoryId,
      total_hours: parseFloat(t.total_hours || 0),
      created_at: t.created_at ? new Date(t.created_at) : new Date(),
      updated_at: t.updated_at ? new Date(t.updated_at) : new Date(),
    });
  }

  // 4. Projects
  const projects = data.projects || [];
  console.log(`💼 Importing ${projects.length} projects...`);
  const projectCollection = db.collection('projects');
  await projectCollection.deleteMany({});
  for (const p of projects) {
    const mongoId = new mongoose.Types.ObjectId();
    projectMap.set(Number(p.id), mongoId.toString());
    const userId = userMap.get(Number(p.user_id)) || String(p.user_id);
    await projectCollection.insertOne({
      _id: mongoId,
      legacy_id: Number(p.id),
      user_id: String(userId),
      name: p.name,
      color: p.color || '#8B5CF6',
      description: p.description || null,
      total_hours: parseFloat(p.total_hours || 0),
      created_at: p.created_at ? new Date(p.created_at) : new Date(),
      updated_at: p.updated_at ? new Date(p.updated_at) : new Date(),
    });
  }

  // 5. Study Sessions
  const sessions = data.study_sessions || [];
  console.log(`⏱️ Importing ${sessions.length} study sessions...`);
  const sessionCollection = db.collection('study_sessions');
  await sessionCollection.deleteMany({});
  for (const s of sessions) {
    const mongoId = new mongoose.Types.ObjectId();
    sessionMap.set(Number(s.id), mongoId.toString());
    const userId = userMap.get(Number(s.user_id)) || String(s.user_id);
    const technologyId = s.technology_id ? (techMap.get(Number(s.technology_id)) || null) : null;
    const projectId = s.project_id ? (projectMap.get(Number(s.project_id)) || null) : null;
    await sessionCollection.insertOne({
      _id: mongoId,
      legacy_id: Number(s.id),
      user_id: String(userId),
      technology_id: technologyId,
      project_id: projectId,
      session_date: s.session_date,
      start_time: s.start_time,
      end_time: s.end_time,
      duration_minutes: Number(s.duration_minutes),
      duration_hours: parseFloat(s.duration_hours),
      note: s.note || null,
      created_at: s.created_at ? new Date(s.created_at) : new Date(),
      updated_at: s.updated_at ? new Date(s.updated_at) : new Date(),
    });
  }

  // 6. Goals, Levels, Streaks, XP History
  const goals = data.daily_goals || [];
  const goalCollection = db.collection('daily_goals');
  await goalCollection.deleteMany({});
  for (const g of goals) {
    const userId = userMap.get(Number(g.user_id)) || String(g.user_id);
    await goalCollection.insertOne({
      user_id: String(userId),
      target_hours: parseFloat(g.target_hours || 10),
      effective_date: g.effective_date || null,
      created_at: g.created_at ? new Date(g.created_at) : new Date(),
      updated_at: g.updated_at ? new Date(g.updated_at) : new Date(),
    });
  }

  const levels = data.levels || [];
  const levelCollection = db.collection('levels');
  await levelCollection.deleteMany({});
  for (const l of levels) {
    const userId = userMap.get(Number(l.user_id)) || String(l.user_id);
    await levelCollection.insertOne({
      user_id: String(userId),
      current_level: Number(l.current_level || 1),
      current_xp: Number(l.current_xp || 0),
      total_xp: Number(l.total_xp || 0),
      xp_to_next_level: Number(l.xp_to_next_level || 1000),
      updated_at: l.updated_at ? new Date(l.updated_at) : new Date(),
    });
  }

  const streaks = data.streaks || [];
  const streakCollection = db.collection('streaks');
  await streakCollection.deleteMany({});
  for (const str of streaks) {
    const userId = userMap.get(Number(str.user_id)) || String(str.user_id);
    await streakCollection.insertOne({
      user_id: String(userId),
      current_streak: Number(str.current_streak || 0),
      longest_streak: Number(str.longest_streak || 0),
      last_study_date: str.last_study_date || null,
      updated_at: str.updated_at ? new Date(str.updated_at) : new Date(),
    });
  }

  const xpHistory = data.xp_history || [];
  console.log(`✨ Importing ${xpHistory.length} XP history records...`);
  const xpCollection = db.collection('xp_history');
  await xpCollection.deleteMany({});
  for (const x of xpHistory) {
    const userId = userMap.get(Number(x.user_id)) || String(x.user_id);
    const sessionId = x.session_id ? (sessionMap.get(Number(x.session_id)) || null) : null;
    await xpCollection.insertOne({
      user_id: String(userId),
      session_id: sessionId,
      xp_amount: Number(x.xp_amount),
      source: x.source || 'study',
      description: x.description || null,
      created_at: x.created_at ? new Date(x.created_at) : new Date(),
    });
  }

  // 7. Achievements & Challenges
  const achievements = data.achievements || [];
  console.log(`🏆 Importing ${achievements.length} achievements...`);
  const achCollection = db.collection('achievements');
  await achCollection.deleteMany({});
  for (const a of achievements) {
    const userId = userMap.get(Number(a.user_id)) || String(a.user_id);
    await achCollection.insertOne({
      user_id: String(userId),
      badge_key: a.badge_key,
      badge_name: a.badge_name,
      badge_description: a.badge_description,
      badge_icon: a.badge_icon || 'trophy',
      unlocked_at: a.unlocked_at ? new Date(a.unlocked_at) : new Date(),
    });
  }

  const challenges = data.challenges || [];
  console.log(`🎯 Importing ${challenges.length} challenges...`);
  const chCollection = db.collection('challenges');
  await chCollection.deleteMany({});
  for (const ch of challenges) {
    const userId = userMap.get(Number(ch.user_id)) || String(ch.user_id);
    await chCollection.insertOne({
      user_id: String(userId),
      challenge_key: ch.challenge_key,
      challenge_name: ch.challenge_name,
      challenge_description: ch.challenge_description,
      target_value: Number(ch.target_value),
      current_value: Number(ch.current_value || 0),
      unit: ch.unit || 'days',
      status: ch.status || 'active',
      started_at: ch.started_at ? new Date(ch.started_at) : new Date(),
      completed_at: ch.completed_at ? new Date(ch.completed_at) : null,
    });
  }

  // 8. Daily Notes
  const notes = data.daily_notes || [];
  console.log(`📝 Importing ${notes.length} daily notes...`);
  const noteCollection = db.collection('daily_notes');
  await noteCollection.deleteMany({});
  for (const n of notes) {
    const userId = userMap.get(Number(n.user_id)) || String(n.user_id);
    await noteCollection.insertOne({
      user_id: String(userId),
      note_date: n.note_date,
      content: n.content || null,
      productivity_score: n.productivity_score ? Number(n.productivity_score) : null,
      created_at: n.created_at ? new Date(n.created_at) : new Date(),
      updated_at: n.updated_at ? new Date(n.updated_at) : new Date(),
    });
  }

  // 9. Auth Sessions
  const authSessions = data.auth_sessions || [];
  const authCollection = db.collection('auth_sessions');
  await authCollection.deleteMany({});
  for (const s of authSessions) {
    const userId = userMap.get(Number(s.user_id)) || String(s.user_id);
    await authCollection.insertOne({
      user_id: String(userId),
      token_hash: s.token_hash,
      expires_at: s.expires_at ? new Date(s.expires_at) : new Date(),
      created_at: s.created_at ? new Date(s.created_at) : new Date(),
    });
  }

  // 10. Competitive Leagues & Memberships
  const leagues = data.competitive_leagues || [];
  const leagueCollection = db.collection('competitive_leagues');
  await leagueCollection.deleteMany({});
  const leagueMap = new Map();
  for (const lg of leagues) {
    const mongoId = new mongoose.Types.ObjectId();
    leagueMap.set(Number(lg.id), mongoId.toString());
    await leagueCollection.insertOne({
      _id: mongoId,
      legacy_id: Number(lg.id),
      name: lg.name,
      tier: lg.tier || 'bronze',
      min_hours: Number(lg.min_hours || 0),
      description: lg.description || null,
      created_at: lg.created_at ? new Date(lg.created_at) : new Date(),
    });
  }

  const memberships = data.league_memberships || [];
  const membershipCollection = db.collection('league_memberships');
  await membershipCollection.deleteMany({});
  for (const m of memberships) {
    const userId = userMap.get(Number(m.user_id)) || String(m.user_id);
    const leagueId = m.league_id ? (leagueMap.get(Number(m.league_id)) || null) : null;
    await membershipCollection.insertOne({
      user_id: String(userId),
      league_id: leagueId,
      points: Number(m.points || 0),
      rank: Number(m.rank || 1),
      joined_at: m.joined_at ? new Date(m.joined_at) : new Date(),
      updated_at: m.updated_at ? new Date(m.updated_at) : new Date(),
    });
  }

  const leagueMessages = data.league_messages || [];
  const leagueMsgCollection = db.collection('league_messages');
  await leagueMsgCollection.deleteMany({});
  for (const lm of leagueMessages) {
    const userId = userMap.get(Number(lm.sender_id)) || String(lm.sender_id);
    const leagueId = lm.league_id ? (leagueMap.get(Number(lm.league_id)) || null) : null;
    await leagueMsgCollection.insertOne({
      sender_id: String(userId),
      league_id: leagueId,
      message: lm.message,
      created_at: lm.created_at ? new Date(lm.created_at) : new Date(),
    });
  }

  console.log('🎉 ==============================================');
  console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
  console.log(`📊 Migrated: ${users.length} users, ${sessions.length} sessions, ${technologies.length} technologies, ${projects.length} projects, ${categories.length} categories, ${achievements.length} badges, ${notes.length} notes, ${xpHistory.length} XP records.`);
  console.log('🎉 100% of study data is safely in MongoDB Atlas!');
  console.log('🎉 ==============================================');

  await mongoose.disconnect();
}

importToMongo().catch(err => {
  console.error('❌ Import error:', err);
  process.exit(1);
});
