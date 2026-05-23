import { getDatabase } from './database.js';
import { SANDBOX_COLORS } from '../constants/sandbox.js';

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    color: row.color,
    userDataPath: row.user_data_path,
    chromePid: row.chrome_pid,
    status: row.status,
    fingerprintId: row.fingerprint_id,
    memoryUsage: row.memory_usage,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    lastActiveAt: row.last_active_at,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
  };
}

export const sandboxStore = {
  getAll() {
    const rows = getDatabase().prepare('SELECT * FROM sandboxes').all();
    return rows.map(mapRow);
  },

  getById(id) {
    const row = getDatabase().prepare('SELECT * FROM sandboxes WHERE id = ?').get(id);
    return mapRow(row);
  },

  create(data) {
    getDatabase().prepare(`
      INSERT INTO sandboxes (id, name, category, color, user_data_path, fingerprint_id, metadata)
      VALUES (@id, @name, @category, @color, @userDataPath, @fingerprintId, @metadata)
    `).run({
      id: data.id,
      name: data.name,
      category: data.category || 'other',
      color: data.color || SANDBOX_COLORS.sandbox,
      userDataPath: data.userDataPath,
      fingerprintId: data.fingerprintId,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    });
    return this.getById(data.id);
  },

  update(id, data) {
    const fields = [];
    const params = { id };

    const mapping = {
      name: 'name',
      category: 'category',
      color: 'color',
      userDataPath: 'user_data_path',
      chromePid: 'chrome_pid',
      status: 'status',
      fingerprintId: 'fingerprint_id',
      memoryUsage: 'memory_usage',
      lastUsedAt: 'last_used_at',
      lastActiveAt: 'last_active_at',
    };

    for (const [key, column] of Object.entries(mapping)) {
      if (data[key] !== undefined) {
        fields.push(`${column} = @${key}`);
        params[key] = data[key];
      }
    }

    if (data.metadata !== undefined) {
      fields.push('metadata = @metadata');
      params.metadata = data.metadata ? JSON.stringify(data.metadata) : null;
    }

    if (fields.length === 0) return this.getById(id);

    getDatabase().prepare(`UPDATE sandboxes SET ${fields.join(', ')} WHERE id = @id`).run(params);
    return this.getById(id);
  },

  delete(id) {
    getDatabase().prepare('DELETE FROM sandboxes WHERE id = ?').run(id);
  },
};
