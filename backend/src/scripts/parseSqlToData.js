import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

function parseSql(sql) {
  const tables = {};
  
  // Find all INSERT INTO statements
  // MySQL dump inserts are typically formatted as:
  // INSERT INTO `table_name` (`col1`, `col2`, ...) VALUES (val1, val2, ...), (val3, val4, ...);
  // or multi-line inserts.
  
  const insertRegex = /INSERT INTO `([^`]+)`\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/g;
  let match;
  
  while ((match = insertRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const columns = match[2].split(',').map(c => c.trim().replace(/`/g, ''));
    const valuesStr = match[3].trim();
    
    if (!tables[tableName]) {
      tables[tableName] = [];
    }
    
    // Parse the values tuples: (val1, val2, ...), (val3, val4, ...)
    const rows = parseValuesTuples(valuesStr);
    for (const row of rows) {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx] !== undefined ? row[idx] : null;
      });
      tables[tableName].push(obj);
    }
  }
  
  return tables;
}

function parseValuesTuples(str) {
  const rows = [];
  let inString = false;
  let stringChar = '';
  let isEscaped = false;
  let depth = 0;
  let currentTuple = [];
  let currentVal = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (isEscaped) {
      currentVal += char;
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      isEscaped = true;
      continue;
    }

    if (inString) {
      if (char === stringChar) {
        // check for escaped quote like ''
        if (str[i + 1] === stringChar) {
          currentVal += stringChar;
          i++; // skip next quote
        } else {
          inString = false;
        }
      } else {
        currentVal += char;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === '(') {
      if (depth === 0) {
        currentTuple = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
      depth++;
      continue;
    }

    if (char === ')') {
      depth--;
      if (depth === 0) {
        // End of tuple
        currentTuple.push(cleanVal(currentVal));
        rows.push(currentTuple);
        currentTuple = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
      continue;
    }

    if (char === ',' && depth === 1) {
      currentTuple.push(cleanVal(currentVal));
      currentVal = '';
      continue;
    }

    if (depth >= 1) {
      currentVal += char;
    }
  }

  return rows;
}

function cleanVal(v) {
  const trimmed = v.trim();
  if (trimmed.toUpperCase() === 'NULL') return null;
  return trimmed;
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(process.argv[2] || path.resolve(scriptDir, '../../../database/devtracker.sql'));
const sql = fs.readFileSync(sqlPath, 'utf8');

const tables = parseSql(sql);

console.log('--- PARSED TABLES SUMMARY ---');
for (const [table, rows] of Object.entries(tables)) {
  console.log(`Table: ${table} -> ${rows.length} rows`);
}

const output = {
  exported_at: new Date().toISOString(),
  data: tables
};

const privateBackupDir = path.resolve(scriptDir, '../../private-backups');
fs.mkdirSync(privateBackupDir, { recursive: true });
const outputPath = path.join(privateBackupDir, 'devtracker-mysql-backup.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), { mode: 0o600 });
console.log(`Private SQL backup written to ${outputPath}`);
