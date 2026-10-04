import fs from 'node:fs';
import path from 'node:path';

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

async function inspectLegacyBackup() {
  const inputFile = option('--input');
  if (!inputFile) throw new Error('Specify an explicit backup path with --input <file.json>.');

  const backupFile = path.resolve(inputFile);
  if (!fs.existsSync(backupFile)) throw new Error('Backup file not found: ' + backupFile);
  const parsed = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  const data = parsed?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('This inspection tool expects the legacy SQL export format with a top-level data object.');
  }

  const collections = [
    'users', 'study_sessions', 'technology_categories', 'technologies', 'projects', 'daily_goals',
    'levels', 'streaks', 'xp_history', 'achievements', 'challenges', 'daily_notes', 'auth_sessions',
  ];
  const counts = Object.fromEntries(collections.map(name => [name, Array.isArray(data[name]) ? data[name].length : 0]));
  console.log('Legacy backup inspection only. No database connection or writes were made.');
  console.log(`Backup: ${backupFile}`);
  console.log(JSON.stringify(counts, null, 2));
  if (process.argv.includes('--apply')) {
    throw new Error('Legacy import is disabled because its historical field and collection mappings do not match the current MongoDB models. Use Settings > Data Backup for versioned personal backups, or prepare a separately reviewed migration for this exact source schema.');
  }
}

inspectLegacyBackup().catch(error => {
  console.error(`Backup inspection failed: ${error.message}`);
  process.exitCode = 1;
});
