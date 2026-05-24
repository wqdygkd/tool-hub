import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APP_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const DATA_DIR = path.join(APP_ROOT, 'data');
const EXTENSION_DIR = path.join(APP_ROOT, 'tools', 'sessionbox', 'extension');

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
  return APP_ROOT;
}

export function getDataDirectory() {
  return DATA_DIR;
}

export function getSandboxesDirectory() {
  return path.join(DATA_DIR, 'sandboxes');
}

export function getDatabasePath() {
  return path.join(DATA_DIR, 'config.db');
}

export function getExtensionTemplatePath() {
  return EXTENSION_DIR;
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
  return path.join(DATA_DIR, 'shared', 'fingerprint_ext');
}