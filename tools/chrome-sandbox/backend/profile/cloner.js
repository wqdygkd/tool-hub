import fs from 'fs-extra';
import path from 'path';
import { getDefaultChromeProfilePath, getChromeUserDataRoot, getSandboxProfileDirectoryName } from '../utils/path-helper.js';
import { copyIfExists, ensureDir, readJsonFile, removeIfExists, writeJsonFile } from '../utils/file-ops.js';
import { logger } from '../utils/logger.js';

const PROFILE_ITEMS_CORE = ['Bookmarks', 'Preferences'];
const PROFILE_ITEM_SECURE_PREFS = 'Secure Preferences';
const EXTENSION_PROFILE_ITEMS = [
  'Extensions',
  'Extension State',
  'Local Extension Settings',
  'Extension Scripts',
  'Extension Rules',
  PROFILE_ITEM_SECURE_PREFS,
];
const REPAIR_ITEMS = EXTENSION_PROFILE_ITEMS.filter((item) => item !== 'Extensions' && item !== PROFILE_ITEM_SECURE_PREFS);

const EXTENSION_ASSET_ITEMS = ['Extensions', ...REPAIR_ITEMS];

function getCloneItems(inheritExtensions) {
  return inheritExtensions
    ? [...PROFILE_ITEMS_CORE, PROFILE_ITEM_SECURE_PREFS, ...EXTENSION_ASSET_ITEMS]
    : PROFILE_ITEMS_CORE;
}

async function removeExtensionProfileData(profilePath) {
  for (const item of EXTENSION_PROFILE_ITEMS) {
    await removeIfExists(path.join(profilePath, item));
  }
}

export async function cloneProfile(
  targetProfilePath,
  sourceProfilePath = getDefaultChromeProfilePath(),
  { inheritExtensions = false } = {},
) {
  await ensureDir(targetProfilePath);
  const items = getCloneItems(inheritExtensions);

  for (const item of items) {
    const src = path.join(sourceProfilePath, item);
    const dest = path.join(targetProfilePath, item);
    const copied = await copyIfExists(src, dest);
    logger.info('Profile clone item', { item, copied, inheritExtensions, src, dest });
  }

  await patchPreferences(targetProfilePath, { inheritExtensions });
  if (!inheritExtensions) {
    await removeExtensionProfileData(targetProfilePath);
  }
  return targetProfilePath;
}

export async function initSandboxUserData(
  sandboxPath,
  sourceProfilePath = getDefaultChromeProfilePath(),
  { inheritExtensions = false } = {},
) {
  const sandboxId = path.basename(sandboxPath);
  const profileDirName = getSandboxProfileDirectoryName(sandboxId);
  const profilePath = path.join(sandboxPath, profileDirName);
  await cloneProfile(profilePath, sourceProfilePath, { inheritExtensions });
  await writeLocalStateProfile(sandboxPath, profileDirName, { copyFromSource: true, inheritExtensions });
  return sandboxPath;
}

export async function repairSandboxProfile(
  sandboxPath,
  sourceProfilePath = getDefaultChromeProfilePath(),
  { inheritExtensions = false } = {},
) {
  const sandboxId = path.basename(sandboxPath);
  const profileDirName = getSandboxProfileDirectoryName(sandboxId);
  const profilePath = await ensureSandboxProfilePath(sandboxPath, profileDirName);
  await ensureDir(profilePath);

  if (inheritExtensions) {
    for (const item of REPAIR_ITEMS) {
      const dest = path.join(profilePath, item);
      if (!await fs.pathExists(dest)) {
        const src = path.join(sourceProfilePath, item);
        const copied = await copyIfExists(src, dest);
        if (copied) {
          logger.info('Profile repair item', { item, src, dest });
        }
      }
    }
  } else {
    await removeExtensionProfileData(profilePath);
  }

  const localStatePath = path.join(sandboxPath, 'Local State');
  if (!await fs.pathExists(localStatePath)) {
    await writeLocalStateProfile(sandboxPath, profileDirName, { copyFromSource: true, inheritExtensions });
  } else {
    await writeLocalStateProfile(sandboxPath, profileDirName, { inheritExtensions });
  }

  await patchPreferences(profilePath, { inheritExtensions });
}

async function ensureSandboxProfilePath(sandboxPath, profileDirName) {
  const profilePath = path.join(sandboxPath, profileDirName);
  const legacyProfilePath = path.join(sandboxPath, 'Default');

  if (!await fs.pathExists(profilePath) && await fs.pathExists(legacyProfilePath)) {
    await fs.move(legacyProfilePath, profilePath);
    logger.info('Migrated sandbox profile directory', { from: 'Default', to: profileDirName });
  }

  return profilePath;
}

function applySandboxProfileMeta(localState, profileDirName) {
  localState.profile = localState.profile || {};
  localState.profile.info_cache = {
    [profileDirName]: {
      name: profileDirName,
      is_using_default_name: true,
    },
  };
  localState.profile.last_used = profileDirName;
  localState.profile.profiles_created = 1;
  localState.profile.profiles_order = [profileDirName];
}

function stripLocalStateExtensions(localState) {
  delete localState.extensions;
  delete localState.updateclientdata;
}

async function writeLocalStateProfile(
  sandboxPath,
  profileDirName,
  { copyFromSource = false, inheritExtensions = false } = {},
) {
  const destLocalState = path.join(sandboxPath, 'Local State');

  if (copyFromSource) {
    const sourceLocalState = path.join(getChromeUserDataRoot(), 'Local State');
    if (await fs.pathExists(sourceLocalState)) {
      await fs.copy(sourceLocalState, destLocalState, { overwrite: true });
    }
  }

  const localState = await readJsonFile(destLocalState, {});
  applySandboxProfileMeta(localState, profileDirName);
  if (!inheritExtensions) {
    stripLocalStateExtensions(localState);
  }
  await writeJsonFile(destLocalState, localState);
  logger.info('Local State updated for sandbox profile', { profileDirName, destLocalState, inheritExtensions });
}

async function patchPreferences(profilePath, { inheritExtensions = false } = {}) {
  const prefsPath = path.join(profilePath, 'Preferences');
  const prefs = await readJsonFile(prefsPath, {});

  prefs.session = prefs.session || {};
  prefs.session.restore_on_startup = 1;

  if (!inheritExtensions) {
    const developerMode = prefs.extensions?.ui?.developer_mode;
    prefs.extensions = {
      settings: { enable_extensions: true },
      ...(developerMode !== undefined ? { ui: { developer_mode: developerMode } } : {}),
    };
  } else {
    prefs.extensions = prefs.extensions || {};
    prefs.extensions.settings = prefs.extensions.settings || {};
    prefs.extensions.settings.enable_extensions = true;
  }

  await writeJsonFile(prefsPath, prefs);
  logger.info('Preferences patched for session restore and extensions', { prefsPath, inheritExtensions });
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
