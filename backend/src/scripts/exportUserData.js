import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDatabase } from '../config/database.js';
import { ExportService } from '../services/index.js';
import { UserModel } from '../models/UserModel.js';

dotenv.config();

async function exportUserData() {
  const idFlag = process.argv.indexOf('--user-id');
  const userId = idFlag >= 0 ? process.argv[idFlag + 1] : null;
  if (!userId) throw new Error('Provide the account to export with --user-id <account-id>.');

  await connectDatabase();
  try {
    const user = await UserModel.findById(userId);
    if (!user) throw new Error('The requested account was not found.');
    const backup = await ExportService.exportData('json', user.id);
    const directory = path.resolve(process.cwd(), 'private-backups');
    await fs.mkdir(directory, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    const safeUsername = String(user.username).replace(/[^a-zA-Z0-9_-]/g, '_');
    const output = path.join(directory, `codelume-${safeUsername}-${date}.json`);
    await fs.writeFile(output, JSON.stringify(backup, null, 2), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    console.log(`Private account backup written to ${output}`);
  } finally {
    await mongoose.disconnect();
  }
}

exportUserData().catch(error => {
  console.error(`Export failed: ${error.message}`);
  process.exitCode = 1;
});
