import fs from 'fs-extra';
import path from 'path';
import { getExtensionTemplatePath, getSharedFingerprintExtPath } from '../utils/path-helper.js';
import { ensureDir, linkOrCopyTree } from '../utils/file-ops.js';
import { logger } from '../utils/logger.js';

const CONFIG_FILE = 'fingerprint-config.json';

export async function updateFingerprintConfig(targetPath, fingerprint) {
  await ensureDir(targetPath);
  const configPath = path.join(targetPath, CONFIG_FILE);
  await fs.writeJson(configPath, fingerprint, { spaces: 2 });
}

async function ensureSharedFingerprintExtension() {
  const sharedPath = getSharedFingerprintExtPath();
  const manifestPath = path.join(sharedPath, 'manifest.json');

  if (await fs.pathExists(manifestPath)) {
    return sharedPath;
  }

  const templatePath = getExtensionTemplatePath();
  await fs.copy(templatePath, sharedPath, {
    overwrite: true,
    filter: (src) => path.basename(src) !== CONFIG_FILE,
  });
  logger.info('Shared fingerprint extension initialized', { sharedPath });
  return sharedPath;
}

async function materializeFingerprintExtension(targetPath, sharedPath) {
  await ensureDir(targetPath);
  await linkOrCopyTree(sharedPath, targetPath);
}

export async function prepareFingerprintExtension(targetPath, fingerprint) {
  const sharedPath = await ensureSharedFingerprintExtension();
  await materializeFingerprintExtension(targetPath, sharedPath);
  await updateFingerprintConfig(targetPath, fingerprint);
  return targetPath;
}
