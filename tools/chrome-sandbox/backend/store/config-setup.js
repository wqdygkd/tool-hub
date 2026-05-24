import { getDatabase } from './database.js';
import { isDataDirectoryConfigured, markDataDirectoryConfigured } from '../utils/path-helper.js';
import { logger } from '../utils/logger.js';

export async function resolveDataDirectoryConfigured() {
  if (await isDataDirectoryConfigured()) {
    return true;
  }

  try {
    const hasSandbox = getDatabase().prepare('SELECT 1 FROM sandboxes LIMIT 1').get();
    if (hasSandbox) {
      await markDataDirectoryConfigured();
      return true;
    }
  } catch (error) {
    logger.warn('Failed to check sandbox migration state', { error: error.message });
  }

  return false;
}

export async function withSetupState(config, extra = {}) {
  const dataDirectoryConfigured = await resolveDataDirectoryConfigured();
  return {
    ...config,
    dataDirectory: dataDirectoryConfigured ? config.dataDirectory : '',
    dataDirectoryConfigured,
    ...extra,
  };
}
