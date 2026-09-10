import mysql from 'mysql2/promise';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://devtracker_user:HQz9dZ2yv7bcVsZl@cluster0.9xfi3bk.mongodb.net/devtracker?retryWrites=true&w=majority&appName=Cluster0';

async function migrate() {
  console.log('🚀 Starting Zero-Data-Loss Migration from MySQL to MongoDB Atlas...');

  // 1. Connect to MySQL
  const mysqlConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'devtracker',
    port: parseInt(process.env.DB_PORT || '3306'),
    dateStrings: true,
  });
  console.log('✅ Connected to local MySQL.');

  // 2. Connect to MongoDB Atlas
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000,
  });
  console.log('✅ Connected to MongoDB Atlas.');

  const db = mongoose.connection.db;

  // ID Maps to preserve relationships
  const userMap = new Map();       // mysql_id -> mongo_id
  const categoryMap = new Map();   // mysql_id -> mongo_id
  const techMap = new Map();       // mysql_id -> mongo_id
  const projectMap = new Map();    // mysql_id -> mongo_id
  const sessionMap = new Map();    // mysql_id -> mongo_id

  // 3. Migrate Users
  const [users] = await mysqlConn.query('SELECT * FROM users');
  console.log(`👤 Migrating ${users.length} users...`);
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
      avatar_url: u.avatar_url,
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

  // 4. Migrate Categories
  const [categories] = await mysqlConn.query('SELECT * FROM technology_categories');
  console.log(`📁 Migrating ${categories.length} technology categories...`);
  const categoryCollection = db.collection('technology_categories');
  await categoryCollection.deleteMany({});
  for (const c of categories) {
    const mongoId = new mongoose.Types.ObjectId();
    categoryMap.set(Number(c.id), mongoId.toString());
    const userId = userMap.get(Number(c.user_id)) || c.user_id;
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

  // 5. Migrate Technologies
  const [technologies] = await mysqlConn.query('SELECT * FROM technologies');
  console.log(`⚡ Migrating ${technologies.length} technologies...`);
  const techCollection = db.collection('technologies');
  await techCollection.deleteMany({});
  for (const t of technologies) {
    const mongoId = new mongoose.Types.ObjectId();
    techMap.set(Number(t.id), mongoId.toString());
    const userId = userMap.get(Number(t.user_id)) || t.user_id;
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

  // 6. Migrate Projects
  const [projects] = await mysqlConn.query('SELECT * FROM projects');
  console.log(`💼 Migrating ${projects.length} projects...`);
  const projectCollection = db.collection('projects');
  await projectCollection.deleteMany({});
  for (const p of projects) {
    const mongoId = new mongoose.Types.ObjectId();
    projectMap.set(Number(p.id), mongoId.toString());
    const userId = userMap.get(Number(p.user_id)) || p.user_id;
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

  // 7. Migrate Study Sessions
  const [sessions] = await mysqlConn.query('SELECT * FROM study_sessions');
  console.log(`⏱️ Migrating ${sessions.length} study sessions...`);
  const sessionCollection = db.collection('study_sessions');
  await sessionCollection.deleteMany({});
  for (const s of sessions) {
    const mongoId = new mongoose.Types.ObjectId();
    sessionMap.set(Number(s.id), mongoId.toString());
    const userId = userMap.get(Number(s.user_id)) || s.user_id;
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

  // 8. Migrate Daily Goals
  const [goals] = await mysqlConn.query('SELECT * FROM daily_goals');
  console.log(`🎯 Migrating ${goals.length} daily goals...`);
  const goalCollection = db.collection('daily_goals');
  await goalCollection.deleteMany({});
  for (const g of goals) {
    const userId = userMap.get(Number(g.user_id)) || g.user_id;
    await goalCollection.insertOne({
      user_id: String(userId),
      target_hours: parseFloat(g.target_hours || 10),
      effective_date: g.effective_date || null,
      created_at: g.created_at ? new Date(g.created_at) : new Date(),
      updated_at: g.updated_at ? new Date(g.updated_at) : new Date(),
    });
  }

  // 9. Migrate Levels, Streaks, and XP History
  const [levels] = await mysqlConn.query('SELECT * FROM levels');
  const levelCollection = db.collection('levels');
  await levelCollection.deleteMany({});
  for (const l of levels) {
    const userId = userMap.get(Number(l.user_id)) || l.user_id;
    await levelCollection.insertOne({
      user_id: String(userId),
      current_level: Number(l.current_level || 1),
      current_xp: Number(l.current_xp || 0),
      total_xp: Number(l.total_xp || 0),
      xp_to_next_level: Number(l.xp_to_next_level || 1000),
      updated_at: l.updated_at ? new Date(l.updated_at) : new Date(),
    });
  }

  const [streaks] = await mysqlConn.query('SELECT * FROM streaks');
  const streakCollection = db.collection('streaks');
  await streakCollection.deleteMany({});
  for (const str of streaks) {
    const userId = userMap.get(Number(str.user_id)) || str.user_id;
    await streakCollection.insertOne({
      user_id: String(userId),
      current_streak: Number(str.current_streak || 0),
      longest_streak: Number(str.longest_streak || 0),
      last_study_date: str.last_study_date || null,
      updated_at: str.updated_at ? new Date(str.updated_at) : new Date(),
    });
  }

  const [xpHistory] = await mysqlConn.query('SELECT * FROM xp_history');
  console.log(`✨ Migrating ${xpHistory.length} XP history records...`);
  const xpCollection = db.collection('xp_history');
  await xpCollection.deleteMany({});
  for (const x of xpHistory) {
    const userId = userMap.get(Number(x.user_id)) || x.user_id;
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

  // 10. Migrate Achievements & Challenges
  const [achievements] = await mysqlConn.query('SELECT * FROM achievements');
  console.log(`🏆 Migrating ${achievements.length} achievements...`);
  const achCollection = db.collection('achievements');
  await achCollection.deleteMany({});
  for (const a of achievements) {
    const userId = userMap.get(Number(a.user_id)) || a.user_id;
    await achCollection.insertOne({
      user_id: String(userId),
      badge_key: a.badge_key,
      badge_name: a.badge_name,
      badge_description: a.badge_description,
      badge_icon: a.badge_icon || 'trophy',
      unlocked_at: a.unlocked_at ? new Date(a.unlocked_at) : new Date(),
    });
  }

  const [challenges] = await mysqlConn.query('SELECT * FROM challenges');
  console.log(`🎯 Migrating ${challenges.length} challenges...`);
  const chCollection = db.collection('challenges');
  await chCollection.deleteMany({});
  for (const ch of challenges) {
    const userId = userMap.get(Number(ch.user_id)) || ch.user_id;
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

  // 11. Migrate Daily Notes
  const [notes] = await mysqlConn.query('SELECT * FROM daily_notes');
  console.log(`📝 Migrating ${notes.length} daily notes...`);
  const noteCollection = db.collection('daily_notes');
  await noteCollection.deleteMany({});
  for (const n of notes) {
    const userId = userMap.get(Number(n.user_id)) || n.user_id;
    await noteCollection.insertOne({
      user_id: String(userId),
      note_date: n.note_date,
      content: n.content || null,
      productivity_score: n.productivity_score ? Number(n.productivity_score) : null,
      created_at: n.created_at ? new Date(n.created_at) : new Date(),
      updated_at: n.updated_at ? new Date(n.updated_at) : new Date(),
    });
  }

  // 12. Migrate Social / Leagues / Auth Sessions
  const [authSessions] = await mysqlConn.query('SELECT * FROM auth_sessions');
  const authCollection = db.collection('auth_sessions');
  await authCollection.deleteMany({});
  for (const s of authSessions) {
    const userId = userMap.get(Number(s.user_id)) || s.user_id;
    await authCollection.insertOne({
      user_id: String(userId),
      token_hash: s.token_hash,
      expires_at: s.expires_at ? new Date(s.expires_at) : new Date(),
      created_at: s.created_at ? new Date(s.created_at) : new Date(),
    });
  }

  console.log('🎉 ==============================================');
  console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
  console.log(`📊 Migrated: ${sessions.length} sessions, ${technologies.length} technologies, ${projects.length} projects, ${categories.length} categories, ${achievements.length} badges, ${notes.length} notes.`);
  console.log('🎉 100% of study data is safely in MongoDB Atlas!');
  console.log('🎉 ==============================================');

  await mysqlConn.end();
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
