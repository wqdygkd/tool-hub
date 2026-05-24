import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import { sandboxStore } from '../store/sandbox-store.js';
import { fingerprintStore } from '../store/fingerprint-store.js';
import { initSandboxUserData, repairSandboxProfile } from '../profile/cloner.js';
import { generateRandomFingerprint } from '../fingerprint/generator.js';
import { prepareFingerprintExtension, updateFingerprintConfig } from '../fingerprint/config-writer.js';
import { launchChrome } from '../chrome/launcher.js';
import { shouldSkipDeveloperModeSetup, setupSandboxDeveloperMode } from '../chrome/developer-mode.js';
import { killProcess, isRunning, getMemoryUsage, onProcessExit, findRunningPid } from '../chrome/process-manager.js';
import { focusChromeWindow } from '../chrome/window-controller.js';
import {
  getSandboxPath,
  getSandboxProfilePath,
  getSandboxProfileDirectoryName,
  getSandboxFingerprintExtPath,
  getChromeUserDataRoot,
  getDefaultChromeProfilePath,
} from '../utils/path-helper.js';
import { removeIfExists } from '../utils/file-ops.js';
import { logger } from '../utils/logger.js';
import { DEFAULT_SANDBOX_ID, isDefaultSandbox, SANDBOX_COLORS } from '../constants/sandbox.js';
import { IPC_CHANNELS } from '../ipc/channels.js';

let statusEmitter = null;

export function setStatusEmitter(emitter) {
  statusEmitter = emitter;
  onProcessExit((sandboxId) => {
    emit(IPC_CHANNELS.EVENT_PROCESS_EXITED, { sandboxId });
    sandboxStore.update(sandboxId, { status: 'stopped', chromePid: null, memoryUsage: 0 });
  });
}

function emit(channel, payload) {
  if (statusEmitter) statusEmitter(channel, payload);
}

function syncRunningState(sandbox) {
  const running = isRunning(sandbox.id, sandbox.userDataPath);
  const shouldUpdate = running !== (sandbox.status === 'running');
  if (!shouldUpdate) return sandbox;

  const newStatus = running ? 'running' : 'stopped';
  if (!running) emit(IPC_CHANNELS.EVENT_PROCESS_EXITED, { sandboxId: sandbox.id });
  return sandboxStore.update(sandbox.id, { status: newStatus, chromePid: running ? sandbox.chromePid : null, memoryUsage: running ? sandbox.memoryUsage : 0 });
}

async function ensureDefaultSandbox() {
  const userDataPath = getChromeUserDataRoot();
  const existing = sandboxStore.getById(DEFAULT_SANDBOX_ID);

  const sandboxData = {
    id: DEFAULT_SANDBOX_ID,
    name: '默认 Chrome',
    category: 'other',
    color: SANDBOX_COLORS.defaultInstance,
    userDataPath,
    fingerprintId: null,
    metadata: { isDefault: true },
  };

  const sandbox = existing
    ? sandboxStore.update(DEFAULT_SANDBOX_ID, { userDataPath, metadata: { isDefault: true } })
    : sandboxStore.create(sandboxData);

  if (!existing) logger.info('Default Chrome sandbox registered', { userDataPath });
  return sandbox;
}

function sortSandboxes(list) {
  return [...list].sort((a, b) => {
    if (isDefaultSandbox(a)) return -1;
    if (isDefaultSandbox(b)) return 1;
    return 0;
  });
}

async function focusRunningSandbox(sandbox) {
  const pid = findRunningPid(sandbox.id, sandbox.userDataPath) || sandbox.chromePid;
  if (!pid) return null;
  await focusChromeWindow(pid);
  return sandboxStore.update(sandbox.id, {
    status: 'running',
    chromePid: pid,
    lastActiveAt: new Date().toISOString(),
  });
}

export const sandboxService = {
  async getAll() {
    await ensureDefaultSandbox();
    return sortSandboxes(sandboxStore.getAll().map(syncRunningState));
  },

  async getById(id) {
    if (id === DEFAULT_SANDBOX_ID) {
      await ensureDefaultSandbox();
    }
    const sandbox = sandboxStore.getById(id);
    return sandbox ? syncRunningState(sandbox) : null;
  },

  async create({ name, fingerprintData = null, inheritExtensions = false, launchOptions = {} }) {
    const sandboxId = `sandbox_${uuidv4().replace(/-/g, '').slice(0, 8)}`;
    const sandboxPath = getSandboxPath(sandboxId);
    const profilePath = getSandboxProfilePath(sandboxId);
    const fingerprintExtPath = getSandboxFingerprintExtPath(sandboxId);

    await fs.ensureDir(sandboxPath);
    await initSandboxUserData(sandboxPath, getDefaultChromeProfilePath(), { inheritExtensions });

    const fingerprint = fingerprintData || generateRandomFingerprint();
    fingerprintStore.create(fingerprint);
    await prepareFingerprintExtension(fingerprintExtPath, fingerprint);

    const sandbox = sandboxStore.create({
      id: sandboxId,
      name,
      category: 'other',
      color: SANDBOX_COLORS.sandbox,
      userDataPath: sandboxPath,
      fingerprintId: fingerprint.id,
      metadata: {
        inheritExtensions: Boolean(inheritExtensions),
        launchOptions: {
          disableSafetyChecks: Boolean(launchOptions.disableSafetyChecks),
          disableCors: Boolean(launchOptions.disableCors),
          customArgs: launchOptions.customArgs || '',
        },
      },
    });

    logger.info('Sandbox created', { sandboxId, name, inheritExtensions, launchOptions });
    return sandbox;
  },

  async activate(sandboxId) {
    let sandbox = await this.getById(sandboxId);
    if (!sandbox) throw new Error('沙箱不存在');

    const defaultInstance = isDefaultSandbox(sandbox);

    if (sandbox.status === 'running' && isRunning(sandboxId, sandbox.userDataPath)) {
      return focusRunningSandbox(sandbox);
    }

    if (!defaultInstance) {
      const inheritExtensions = Boolean(sandbox.metadata?.inheritExtensions);
      await repairSandboxProfile(sandbox.userDataPath, undefined, { inheritExtensions });
    }

    const focused = await focusRunningSandbox(sandbox);
    if (focused) return focused;

    const windowPosition = { x: 100, y: 100 };
    const windowSize = { width: 1280, height: 800 };

    let metadata = sandbox.metadata;
    if (!defaultInstance && !metadata?.developerModeEnabled && await shouldSkipDeveloperModeSetup(sandbox)) {
      metadata = { ...(metadata || {}), developerModeEnabled: true };
    }

    const { pid, debugPort } = await launchChrome({
      sandboxId,
      userDataDir: sandbox.userDataPath,
      profileDirectory: defaultInstance ? 'Default' : getSandboxProfileDirectoryName(sandboxId),
      extensionPath: defaultInstance ? null : getSandboxFingerprintExtPath(sandboxId),
      enableDeveloperMode: !defaultInstance && !metadata?.developerModeEnabled,
      windowPosition,
      windowSize,
      launchOptions: metadata?.launchOptions || {},
    });

    if (debugPort && await setupSandboxDeveloperMode(debugPort, {
      x: windowPosition.x,
      y: windowPosition.y,
      width: windowSize.width,
      height: windowSize.height,
    })) {
      metadata = { ...(metadata || {}), developerModeEnabled: true };
    }

    sandbox = sandboxStore.update(sandboxId, {
      status: 'running',
      chromePid: pid,
      lastUsedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      ...(metadata !== sandbox.metadata ? { metadata } : {}),
    });

    emit(IPC_CHANNELS.EVENT_STATUS_CHANGED, { sandboxId, status: 'running' });
    return sandbox;
  },

  async close(sandboxId) {
    const sandbox = await this.getById(sandboxId);
    if (!sandbox) throw new Error('沙箱不存在');

    await killProcess(sandboxId, sandbox.userDataPath);
    const updated = sandboxStore.update(sandboxId, {
      status: 'stopped',
      chromePid: null,
      memoryUsage: 0,
    });

    emit(IPC_CHANNELS.EVENT_STATUS_CHANGED, { sandboxId, status: 'stopped' });
    return updated;
  },

  async delete(sandboxId) {
    const sandbox = await this.getById(sandboxId);
    if (!sandbox) throw new Error('沙箱不存在');

    if (isDefaultSandbox(sandbox)) {
      throw new Error('默认 Chrome 实例不能删除');
    }

    if (sandbox.status === 'running') {
      await this.close(sandboxId);
    }

    await removeIfExists(sandbox.userDataPath);
    sandboxStore.delete(sandboxId);
    logger.info('Sandbox deleted', { sandboxId });
    return true;
  },

  update(sandboxId, data) {
    const sandbox = sandboxStore.getById(sandboxId);
    if (sandbox && isDefaultSandbox(sandbox) && data.name === '') {
      throw new Error('默认实例名称不能为空');
    }
    return sandboxStore.update(sandboxId, data);
  },

  refreshStatus(sandboxId) {
    const sandbox = sandboxStore.getById(sandboxId);
    if (!sandbox) throw new Error('沙箱不存在');

    const pid = findRunningPid(sandboxId, sandbox.userDataPath) || sandbox.chromePid;
    const memoryUsage = getMemoryUsage(pid);
    const updated = sandboxStore.update(sandboxId, { memoryUsage, chromePid: pid || sandbox.chromePid });
    emit(IPC_CHANNELS.EVENT_MEMORY_UPDATE, { sandboxId, memoryUsage });
    return updated;
  },
};

export async function updateSandboxFingerprint(sandboxId, fingerprintData) {
  const sandbox = sandboxStore.getById(sandboxId);
  if (!sandbox) throw new Error('沙箱不存在');
  if (isDefaultSandbox(sandbox)) {
    throw new Error('默认 Chrome 实例不支持指纹伪造');
  }

  fingerprintStore.update(sandbox.fingerprintId, fingerprintData);
  await updateFingerprintConfig(getSandboxFingerprintExtPath(sandboxId), fingerprintData);
  return fingerprintStore.getById(sandbox.fingerprintId);
}
