import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs-extra';
import { app } from 'electron';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use app.isPackaged for reliable detection (NODE_ENV may not be set in packaged apps)
const isDev = !app.isPackaged;

// In development: resolve from source directory
// In production: use electron app paths
const APP_ROOT_DEV = path.resolve(__dirname, '..', '..', '..', '..');

function getChromePaths() {
  const home = os.homedir();
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    const userDataRoot = path.join(localAppData, 'Google', 'Chrome', 'User Data');
    return {
      userDataRoot,
      defaultProfile: path.join(userDataRoot, 'Default'),
      executables: [
        path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      ],
    };
  }
  if (process.platform === 'darwin') {
    const userDataRoot = path.join(home, 'Library', 'Application Support', 'Google', 'Chrome');
    return {
      userDataRoot,
      defaultProfile: path.join(userDataRoot, 'Default'),
      executables: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    };
  }
  const userDataRoot = path.join(home, '.config', 'google-chrome');
  return {
    userDataRoot,
    defaultProfile: path.join(userDataRoot, 'Default'),
    executables: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  };
}

export function getAppRoot() {
  return isDev ? APP_ROOT_DEV : app.getAppPath();
}

export function getDefaultDataDirectory() {
  return isDev
    ? path.join(APP_ROOT_DEV, 'data')
    : path.join(app.getPath('userData'), 'data');
}

let dataDirectoryOverride = null;

export function getBootstrapConfigPath() {
  return path.join(app.getPath('userData'), 'data-root.json');
}

export function setDataDirectoryOverride(dir) {
  dataDirectoryOverride = normalizeDataDirectory(dir);
}

export function isSameDataDirectory(a, b) {
  return path.resolve(a) === path.resolve(b);
}

export async function applyDataDirectoryChange(nextDirectory) {
  const normalized = normalizeDataDirectory(nextDirectory) || getDefaultDataDirectory();
  await fs.ensureDir(normalized);

  const requiresRestart = !isSameDataDirectory(normalized, getDataDirectory());
  if (requiresRestart) {
    const bootstrapTarget = isSameDataDirectory(normalized, getDefaultDataDirectory()) ? null : normalized;
    await saveDataDirectoryOverride(bootstrapTarget);
  }

  return { dataDirectory: normalized, requiresRestart };
}

export function normalizeDataDirectory(dir) {
  if (!dir || !String(dir).trim()) return null;
  return path.resolve(String(dir).trim());
}

export function getDataDirectory() {
  return dataDirectoryOverride || getDefaultDataDirectory();
}

export async function loadDataDirectoryOverride() {
  const bootstrapPath = getBootstrapConfigPath();
  try {
    if (!await fs.pathExists(bootstrapPath)) return;
    const { dataDirectory } = await fs.readJson(bootstrapPath);
    setDataDirectoryOverride(normalizeDataDirectory(dataDirectory));
  } catch (error) {
    logger.warn('Failed to load data directory override', { error: error.message });
  }
}

export async function saveDataDirectoryOverride(dataDirectory) {
  const bootstrapPath = getBootstrapConfigPath();
  await fs.ensureDir(path.dirname(bootstrapPath));
  if (!dataDirectory) {
    await fs.remove(bootstrapPath);
    return;
  }
  await fs.writeJson(bootstrapPath, { dataDirectory }, { spaces: 2 });
}

export function getSandboxesDirectory() {
  return path.join(getDataDirectory(), 'sandboxes');
}

export function getDatabasePath() {
  return path.join(getDataDirectory(), 'config.db');
}

export function getExtensionTemplatePath() {
  // In dev: source directory
  // In prod: extraResources copied to resources/extension/
  return isDev
    ? path.join(APP_ROOT_DEV, 'tools', 'chrome-sandbox', 'extension')
    : path.join(process.resourcesPath, 'extension');
}

export function getDefaultChromeProfilePath() {
  return getChromePaths().defaultProfile;
}

export function getChromeUserDataRoot() {
  return getChromePaths().userDataRoot;
}

export function getDefaultChromePaths() {
  return getChromePaths().executables;
}

export function getSandboxPath(sandboxId) {
  return path.join(getSandboxesDirectory(), sandboxId);
}

export function getSandboxProfileDirectoryName(sandboxId) {
  return sandboxId.replace(/^sandbox_/, 'sb_');
}

export function getSandboxProfilePath(sandboxId) {
  return path.join(getSandboxPath(sandboxId), getSandboxProfileDirectoryName(sandboxId));
}

export function getSandboxFingerprintExtPath(sandboxId) {
  return path.join(getSandboxPath(sandboxId), 'fingerprint_ext');
}

export function getSharedFingerprintExtPath() {
  return path.join(getDataDirectory(), 'shared', 'fingerprint_ext');
}