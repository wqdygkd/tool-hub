import fs from 'fs-extra';
import path from 'path';

export async function linkOrCopyFile(src, dest) {
  await fs.ensureDir(path.dirname(dest));
  if (await fs.pathExists(dest)) {
    await fs.remove(dest);
  }
  try {
    await fs.link(src, dest);
  } catch {
    await fs.copy(src, dest, { overwrite: true });
  }
}

export async function linkOrCopyTree(srcDir, destDir) {
  if (!await fs.pathExists(srcDir)) return;
  await fs.ensureDir(destDir);
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      await linkOrCopyTree(src, dest);
    } else {
      await linkOrCopyFile(src, dest);
    }
  }
}

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
