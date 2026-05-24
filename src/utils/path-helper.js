import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getChromePlatformPaths() {
  const home = os.homedir();
  switch (process.platform) {
    case 'win32': {
      const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
      const userDataRoot = path.join(localAppData, 'Google', 'Chrome', 'User Data');
      return {
        userDataRoot,
        defaultProfile: path.join(userDataRoot, 'Default'),
        chromeExecutables: [
          path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
          path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
          path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        ],
      };
    }
    case 'darwin': {
      const userDataRoot = path.join(home, 'Library', 'Application Support', 'Google', 'Chrome');
      return {
        userDataRoot,
        defaultProfile: path.join(userDataRoot, 'Default'),
        chromeExecutables: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
      };
    }
    default: {
      const userDataRoot = path.join(home, '.config', 'google-chrome');
      return {
        userDataRoot,
        defaultProfile: path.join(userDataRoot, 'Default'),
        chromeExecutables: [
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
        ],
      };
    }
  }
}

export function getAppRoot() {
  return path.resolve(__dirname, '..', '..');
}

export function getDataDirectory() {
  return path.join(getAppRoot(), 'data');
}

export function getSandboxesDirectory() {
  return path.join(getDataDirectory(), 'sandboxes');
}

export function getSharedDirectory() {
  return path.join(getDataDirectory(), 'shared');
}

export function getSharedFingerprintExtPath() {
  return path.join(getSharedDirectory(), 'fingerprint_ext');
}

export function getDatabasePath() {
  return path.join(getDataDirectory(), 'config.db');
}

export function getExtensionTemplatePath() {
  return path.join(getAppRoot(), 'extension');
}

export function getDefaultChromeProfilePath() {
  return getChromePlatformPaths().defaultProfile;
}

export function getChromeUserDataRoot() {
  return getChromePlatformPaths().userDataRoot;
}

export function getDefaultChromePaths() {
  return getChromePlatformPaths().chromeExecutables;
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
