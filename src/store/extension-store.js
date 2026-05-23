import { getDatabase } from './database.js';

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    sandboxId: row.sandbox_id,
    extensionId: row.extension_id,
    extensionName: row.extension_name,
    extensionPath: row.extension_path,
    enabled: Boolean(row.enabled),
  };
}

export const extensionStore = {
  getBySandboxId(sandboxId) {
    const rows = getDatabase().prepare('SELECT * FROM extensions WHERE sandbox_id = ?').all(sandboxId);
    return rows.map(mapRow);
  },

  upsert(data) {
    getDatabase().prepare(`
      INSERT INTO extensions (id, sandbox_id, extension_id, extension_name, extension_path, enabled)
      VALUES (@id, @sandboxId, @extensionId, @extensionName, @extensionPath, @enabled)
      ON CONFLICT(id) DO UPDATE SET
        extension_name = excluded.extension_name,
        extension_path = excluded.extension_path,
        enabled = excluded.enabled
    `).run({
      id: data.id,
      sandboxId: data.sandboxId,
      extensionId: data.extensionId,
      extensionName: data.extensionName,
      extensionPath: data.extensionPath,
      enabled: data.enabled ? 1 : 0,
    });
  },

  toggle(sandboxId, extensionId, enabled) {
    getDatabase().prepare(`
      UPDATE extensions SET enabled = ? WHERE sandbox_id = ? AND extension_id = ?
    `).run(enabled ? 1 : 0, sandboxId, extensionId);
  },
};
