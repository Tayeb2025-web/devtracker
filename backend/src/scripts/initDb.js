import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initDb() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '3306'),
    multipleStatements: true,
  });

  const schemaPath = path.join(__dirname, '../../../database/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  console.log('📦 Initializing DevTracker database...');
  await connection.query(schema);
  // Keep installations created with older versions compatible with the new folders/icons feature.
  const [columns] = await connection.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'technologies'");
  const columnNames = new Set(columns.map(column => column.COLUMN_NAME));
  if (!columnNames.has('custom_icon')) {
    await connection.query('ALTER TABLE technologies ADD COLUMN custom_icon MEDIUMTEXT NULL AFTER icon');
  }
  if (!columnNames.has('category_id')) {
    await connection.query('ALTER TABLE technologies ADD COLUMN category_id INT NULL AFTER custom_icon');
  }
  const [sessionColumns] = await connection.query("SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'study_sessions'");
  const sessionColumnMap = new Map(sessionColumns.map(column => [column.COLUMN_NAME, column]));
  if (sessionColumnMap.get('technology_id')?.IS_NULLABLE === 'NO') {
    await connection.query('ALTER TABLE study_sessions MODIFY COLUMN technology_id INT NULL');
  }
  if (!sessionColumnMap.has('project_id')) {
    await connection.query('ALTER TABLE study_sessions ADD COLUMN project_id INT NULL AFTER technology_id');
    await connection.query('ALTER TABLE study_sessions ADD INDEX idx_session_project (project_id)');
    await connection.query('ALTER TABLE study_sessions ADD CONSTRAINT fk_sessions_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT');
  }
  const [categoryColumns] = await connection.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'technology_categories'");
  if (!categoryColumns.some(column => column.COLUMN_NAME === 'sort_order')) {
    await connection.query('ALTER TABLE technology_categories ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER color');
  }
  const [userColumns] = await connection.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'");
  const userColumnNames = new Set(userColumns.map(column => column.COLUMN_NAME));
  if (!userColumnNames.has('password_hash')) {
    await connection.query('ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER email');
  }
  if (!userColumnNames.has('bio')) {
    await connection.query('ALTER TABLE users ADD COLUMN bio VARCHAR(280) NULL AFTER avatar_url');
  }
  if (!userColumnNames.has('is_profile_public')) {
    await connection.query('ALTER TABLE users ADD COLUMN is_profile_public BOOLEAN NOT NULL DEFAULT TRUE AFTER bio');
  }
  if (!userColumnNames.has('allow_direct_messages')) {
    await connection.query("ALTER TABLE users ADD COLUMN allow_direct_messages ENUM('everyone', 'followers', 'none') NOT NULL DEFAULT 'followers' AFTER is_profile_public");
  }
  await connection.query(`CREATE TABLE IF NOT EXISTS auth_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_auth_token (token_hash)
  )`);
  console.log('✅ Database initialized successfully!');
  await connection.end();
}

initDb().catch(err => {
  console.error('❌ Database initialization failed:', err.message);
  process.exit(1);
});
