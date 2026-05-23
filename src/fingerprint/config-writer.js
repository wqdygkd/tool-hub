import fs from 'fs-extra';
import path from 'path';
import { getExtensionTemplatePath } from '../utils/path-helper.js';
import { ensureDir } from '../utils/file-ops.js';

export async function updateFingerprintConfig(targetPath, fingerprint) {
  await ensureDir(targetPath);
  const configPath = path.join(targetPath, 'fingerprint-config.json');
  await fs.writeJson(configPath, fingerprint, { spaces: 2 });
}

export async function prepareFingerprintExtension(targetPath, fingerprint) {
  await fs.copy(getExtensionTemplatePath(), targetPath, { overwrite: true });
  await updateFingerprintConfig(targetPath, fingerprint);
  return targetPath;
}
