import fs from 'fs';
import path from 'path';

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

const sqlPath = path.resolve('../database/devtracker.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const tables = parseSql(sql);

console.log('--- PARSED TABLES SUMMARY ---');
for (const [table, rows] of Object.entries(tables)) {
  console.log(`Table: ${table} -> ${rows.length} rows`);
}

// Save parsed data to devtracker_mysql_backup.json
const output = {
  exported_at: new Date().toISOString(),
  data: tables
};

fs.writeFileSync('./devtracker_mysql_backup.json', JSON.stringify(output, null, 2));
console.log('Saved to devtracker_mysql_backup.json!');

if (tables.users) {
  console.log('Users found:', tables.users);
}
