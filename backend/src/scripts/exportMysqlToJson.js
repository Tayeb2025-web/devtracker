import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function exportAll() {
  console.log('📦 Exporting all data from local MySQL to backup JSON...');

  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'devtracker',
    port: 3306,
    dateStrings: true,
  });

  const tables = [
    'users',
    'technology_categories',
    'technologies',
    'projects',
    'study_sessions',
    'daily_goals',
    'levels',
    'streaks',
    'xp_history',
    'achievements',
    'challenges',
    'daily_notes',
    'auth_sessions',
    'competitive_leagues',
    'league_memberships',
    'league_messages',
    'user_follows',
    'direct_conversations',
    'direct_messages',
  ];

  const backup = {
    exportedAt: new Date().toISOString(),
    data: {},
  };

  for (const table of tables) {
    try {
      const [rows] = await conn.query(`SELECT * FROM ${table}`);
      backup.data[table] = rows;
      console.log(`  ✓ ${table}: ${rows.length} rows`);
    } catch (e) {
      console.warn(`  ! Could not query ${table}: ${e.message}`);
    }
  }

  const backupPath = path.resolve('./devtracker_mysql_backup.json');
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8');
  console.log(`✅ COMPLETE BACKUP SAVED TO: ${backupPath}`);

  await conn.end();
}

exportAll().catch(console.error);
