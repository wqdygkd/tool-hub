// Auto-synced to electron/preload.cjs via scripts/sync-ipc-channels.js
export const IPC_CHANNELS = {
  SANDBOX_CREATE: 'sandbox:create',
  SANDBOX_DELETE: 'sandbox:delete',
  SANDBOX_ACTIVATE: 'sandbox:activate',
  SANDBOX_CLOSE: 'sandbox:close',
  SANDBOX_GET_ALL: 'sandbox:get-all',
  SANDBOX_UPDATE: 'sandbox:update',
  SANDBOX_REFRESH_STATUS: 'sandbox:refresh-status',
  FINGERPRINT_UPDATE: 'fingerprint:update',
  FINGERPRINT_GET_BY_ID: 'fingerprint:get-by-id',
  FINGERPRINT_GENERATE_RANDOM: 'fingerprint:generate-random',
  CHROME_DETECT_PATH: 'chrome:detect-path',
  CONFIG_GET: 'config:get',
  CONFIG_UPDATE: 'config:update',
  EVENT_STATUS_CHANGED: 'sandbox:status-changed',
  EVENT_PROCESS_EXITED: 'sandbox:process-exited',
  EVENT_MEMORY_UPDATE: 'sandbox:memory-update',
};
