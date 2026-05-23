import fs from 'fs-extra';
import path from 'path';

export async function copyIfExists(src, dest) {
  if (await fs.pathExists(src)) {
    await fs.copy(src, dest, { overwrite: true });
    return true;
  }
  return false;
}

export async function ensureDir(dirPath) {
  await fs.ensureDir(dirPath);
}

export async function removeIfExists(targetPath) {
  if (await fs.pathExists(targetPath)) {
    await fs.remove(targetPath);
  }
}

export async function readJsonFile(filePath, fallback = null) {
  try {
    if (await fs.pathExists(filePath)) {
      return await fs.readJson(filePath);
    }
  } catch {
    // ignore parse errors
  }
  return fallback;
}

export async function writeJsonFile(filePath, data) {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJson(filePath, data, { spaces: 2 });
}
