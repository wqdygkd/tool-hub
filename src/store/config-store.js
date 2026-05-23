import { getDatabase } from './database.js';
import { getDataDirectory } from '../utils/path-helper.js';

const DEFAULTS = {
  chromePath: '',
  defaultProfile: '',
  dataDirectory: getDataDirectory(),
  autoRestoreOnStartup: false,
  preserveDataOnClose: true,
  showMemoryUsage: true,
};

export const configStore = {
  getAll() {
    const rows = getDatabase().prepare('SELECT key, value FROM global_config').all();
    const config = { ...DEFAULTS };
    for (const row of rows) {
      try {
        config[row.key] = JSON.parse(row.value);
      } catch {
        config[row.key] = row.value;
      }
    }
    return config;
  },

  get(key) {
    const row = getDatabase().prepare('SELECT value FROM global_config WHERE key = ?').get(key);
    if (!row) return DEFAULTS[key];
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  },

  update(data) {
    const stmt = getDatabase().prepare(`
      INSERT INTO global_config (key, value, updated_at)
      VALUES (@key, @value, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    for (const [key, value] of Object.entries(data)) {
      stmt.run({ key, value: JSON.stringify(value) });
    }
    return this.getAll();
  },
};
