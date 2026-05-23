import fs from 'fs-extra';
import path from 'path';
import { getDefaultChromeProfilePath, getChromeUserDataRoot } from '../utils/path-helper.js';
import { copyIfExists, ensureDir, readJsonFile, writeJsonFile } from '../utils/file-ops.js';
import { logger } from '../utils/logger.js';

const CLONE_PROFILE_ITEMS = [
  'Extensions',
  'Bookmarks',
  'Preferences',
  'Secure Preferences',
  'Extension State',
  'Local Extension Settings',
  'Extension Scripts',
  'Extension Rules',
];

const REPAIR_PROFILE_ITEMS = CLONE_PROFILE_ITEMS.filter(
  (item) => !['Bookmarks', 'Preferences', 'Extensions'].includes(item),
);

export async function cloneProfile(targetProfilePath, sourceProfilePath = getDefaultChromeProfilePath()) {
  await ensureDir(targetProfilePath);

  for (const item of CLONE_PROFILE_ITEMS) {
    const src = path.join(sourceProfilePath, item);
    const dest = path.join(targetProfilePath, item);
    const copied = await copyIfExists(src, dest);
    logger.info('Profile clone item', { item, copied, src, dest });
  }

  await patchPreferences(targetProfilePath);
  return targetProfilePath;
}

export async function initSandboxUserData(sandboxPath, sourceProfilePath = getDefaultChromeProfilePath()) {
  const profilePath = path.join(sandboxPath, 'Default');
  await cloneProfile(profilePath, sourceProfilePath);
  await initLocalState(sandboxPath);
  return sandboxPath;
}

export async function repairSandboxProfile(sandboxPath, sourceProfilePath = getDefaultChromeProfilePath()) {
  const profilePath = path.join(sandboxPath, 'Default');
  await ensureDir(profilePath);

  for (const item of REPAIR_PROFILE_ITEMS) {
    const dest = path.join(profilePath, item);
    if (!await fs.pathExists(dest)) {
      const src = path.join(sourceProfilePath, item);
      const copied = await copyIfExists(src, dest);
      if (copied) {
        logger.info('Profile repair item', { item, src, dest });
      }
    }
  }

  const localStatePath = path.join(sandboxPath, 'Local State');
  if (!await fs.pathExists(localStatePath)) {
    await initLocalState(sandboxPath);
  }

  await patchPreferences(profilePath);
}

async function initLocalState(sandboxPath) {
  const sourceLocalState = path.join(getChromeUserDataRoot(), 'Local State');
  const destLocalState = path.join(sandboxPath, 'Local State');

  if (await fs.pathExists(sourceLocalState)) {
    await fs.copy(sourceLocalState, destLocalState, { overwrite: true });
  }

  const localState = await readJsonFile(destLocalState, {});
  localState.profile = localState.profile || {};
  localState.profile.info_cache = {
    Default: {
      name: 'Default',
      is_using_default_name: true,
    },
  };
  localState.profile.last_used = 'Default';
  localState.profile.profiles_created = 1;
  localState.profile.profiles_order = ['Default'];

  await writeJsonFile(destLocalState, localState);
  logger.info('Local State initialized', { destLocalState });
}

async function patchPreferences(profilePath) {
  const prefsPath = path.join(profilePath, 'Preferences');
  const prefs = await readJsonFile(prefsPath, {});

  prefs.session = prefs.session || {};
  prefs.session.restore_on_startup = 1;

  prefs.extensions = prefs.extensions || {};
  prefs.extensions.settings = prefs.extensions.settings || {};
  prefs.extensions.settings.enable_extensions = true;

  await writeJsonFile(prefsPath, prefs);
  logger.info('Preferences patched for session restore and extensions', { prefsPath });
}

export async function readExtensionsFromProfile(profilePath) {
  const extensionsDir = path.join(profilePath, 'Extensions');
  if (!await fs.pathExists(extensionsDir)) return [];

  const extensions = [];
  const extensionIds = await fs.readdir(extensionsDir);

  for (const extensionId of extensionIds) {
    if (extensionId.startsWith('.')) continue;
    const extRoot = path.join(extensionsDir, extensionId);
    const stat = await fs.stat(extRoot);
    if (!stat.isDirectory()) continue;

    const versions = await fs.readdir(extRoot);
    const latestVersion = versions.filter((v) => !v.startsWith('.')).sort().pop();
    if (!latestVersion) continue;

    const manifestPath = path.join(extRoot, latestVersion, 'manifest.json');
    let name = extensionId;
    if (await fs.pathExists(manifestPath)) {
      try {
        const manifest = await fs.readJson(manifestPath);
        name = manifest.name || extensionId;
      } catch {
        // ignore
      }
    }

    extensions.push({
      extensionId,
      extensionName: name,
      extensionPath: path.join(extRoot, latestVersion),
    });
  }

  return extensions;
}
