import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import { sandboxStore } from '../store/sandbox-store.js';
import { fingerprintStore } from '../store/fingerprint-store.js';
import { extensionStore } from '../store/extension-store.js';
import { initSandboxUserData, repairSandboxProfile, readExtensionsFromProfile } from '../profile/cloner.js';
import { generateRandomFingerprint } from '../fingerprint/generator.js';
import { prepareFingerprintExtension, updateFingerprintConfig } from '../fingerprint/config-writer.js';
import { launchChrome } from '../chrome/launcher.js';
import { killProcess, isRunning, getMemoryUsage, onProcessExit, findRunningPid } from '../chrome/process-manager.js';
import { focusChromeWindow } from '../chrome/window-controller.js';
import {
  getSandboxPath,
  getSandboxProfilePath,
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
  if (running && sandbox.status !== 'running') {
    return sandboxStore.update(sandbox.id, { status: 'running' });
  }
  if (!running && sandbox.status === 'running') {
    emit(IPC_CHANNELS.EVENT_PROCESS_EXITED, { sandboxId: sandbox.id });
    return sandboxStore.update(sandbox.id, { status: 'stopped', chromePid: null, memoryUsage: 0 });
  }
  return sandbox;
}

async function persistExtensionsFromProfile(sandboxId, profilePath) {
  const extensions = await readExtensionsFromProfile(profilePath);
  for (const ext of extensions) {
    extensionStore.upsert({
      id: `${sandboxId}_${ext.extensionId}`,
      sandboxId,
      extensionId: ext.extensionId,
      extensionName: ext.extensionName,
      extensionPath: ext.extensionPath,
      enabled: true,
    });
  }
}

async function ensureDefaultSandbox() {
  const userDataPath = getChromeUserDataRoot();
  let sandbox = sandboxStore.getById(DEFAULT_SANDBOX_ID);

  if (!sandbox) {
    sandbox = sandboxStore.create({
      id: DEFAULT_SANDBOX_ID,
      name: '默认 Chrome',
      category: 'other',
      color: SANDBOX_COLORS.defaultInstance,
      userDataPath,
      fingerprintId: null,
      metadata: { isDefault: true },
    });
    logger.info('Default Chrome sandbox registered', { userDataPath });
  } else {
    sandbox = sandboxStore.update(DEFAULT_SANDBOX_ID, {
      userDataPath,
      metadata: { isDefault: true },
    });
  }

  await persistExtensionsFromProfile(DEFAULT_SANDBOX_ID, getDefaultChromeProfilePath());
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

  async create({ name, fingerprintData = null }) {
    const sandboxId = `sandbox_${uuidv4().replace(/-/g, '').slice(0, 8)}`;
    const sandboxPath = getSandboxPath(sandboxId);
    const profilePath = getSandboxProfilePath(sandboxId);
    const fingerprintExtPath = getSandboxFingerprintExtPath(sandboxId);

    await fs.ensureDir(sandboxPath);
    await initSandboxUserData(sandboxPath);

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
    });

    await persistExtensionsFromProfile(sandboxId, profilePath);
    logger.info('Sandbox created', { sandboxId, name });
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
      await repairSandboxProfile(sandbox.userDataPath);
    }

    const focused = await focusRunningSandbox(sandbox);
    if (focused) return focused;

    const pid = await launchChrome({
      sandboxId,
      userDataDir: sandbox.userDataPath,
      extensionPath: defaultInstance ? null : getSandboxFingerprintExtPath(sandboxId),
    });

    sandbox = sandboxStore.update(sandboxId, {
      status: 'running',
      chromePid: pid,
      lastUsedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
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
