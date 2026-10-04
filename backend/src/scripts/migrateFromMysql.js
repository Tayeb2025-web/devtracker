console.error('The old MySQL-to-MongoDB replacement migration is retired because its mappings no longer match the current data models. It cannot connect to or modify either database.');
process.exitCode = 1;
