import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels.js';
import { sandboxService, updateSandboxFingerprint } from '../services/sandbox-service.js';
import { fingerprintStore } from '../store/fingerprint-store.js';
import { extensionStore } from '../store/extension-store.js';
import { configStore } from '../store/config-store.js';
import { detectChromePath } from '../chrome/detector.js';
import { generateRandomFingerprint } from '../fingerprint/generator.js';
import { setStatusEmitter } from '../services/sandbox-service.js';
import { logger } from '../utils/logger.js';

function broadcast(channel, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}

export function registerIpcHandlers() {
  setStatusEmitter(broadcast);

  ipcMain.handle(IPC_CHANNELS.SANDBOX_GET_ALL, () => sandboxService.getAll());

  ipcMain.handle(IPC_CHANNELS.SANDBOX_CREATE, async (_event, data) => {
    try {
      return await sandboxService.create(data);
    } catch (error) {
      logger.error('sandbox:create failed', { error: error.message });
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.SANDBOX_DELETE, (_event, sandboxId) => sandboxService.delete(sandboxId));
  ipcMain.handle(IPC_CHANNELS.SANDBOX_ACTIVATE, (_event, sandboxId) => sandboxService.activate(sandboxId));
  ipcMain.handle(IPC_CHANNELS.SANDBOX_CLOSE, (_event, sandboxId) => sandboxService.close(sandboxId));
  ipcMain.handle(IPC_CHANNELS.SANDBOX_UPDATE, (_event, sandboxId, data) => sandboxService.update(sandboxId, data));
  ipcMain.handle(IPC_CHANNELS.SANDBOX_REFRESH_STATUS, (_event, sandboxId) => sandboxService.refreshStatus(sandboxId));

  ipcMain.handle(IPC_CHANNELS.FINGERPRINT_GENERATE_RANDOM, () => generateRandomFingerprint());
  ipcMain.handle(IPC_CHANNELS.FINGERPRINT_GET_BY_ID, (_event, fingerprintId) => fingerprintStore.getById(fingerprintId));
  ipcMain.handle(IPC_CHANNELS.FINGERPRINT_UPDATE, (_event, sandboxId, data) => updateSandboxFingerprint(sandboxId, data));

  ipcMain.handle(IPC_CHANNELS.EXTENSION_GET_ALL, (_event, sandboxId) => extensionStore.getBySandboxId(sandboxId));
  ipcMain.handle(IPC_CHANNELS.EXTENSION_TOGGLE, (_event, sandboxId, extensionId, enabled) => {
    extensionStore.toggle(sandboxId, extensionId, enabled);
    return extensionStore.getBySandboxId(sandboxId);
  });

  ipcMain.handle(IPC_CHANNELS.CHROME_DETECT_PATH, () => detectChromePath());
  ipcMain.handle(IPC_CHANNELS.CONFIG_GET, () => configStore.getAll());
  ipcMain.handle(IPC_CHANNELS.CONFIG_UPDATE, (_event, data) => configStore.update(data));
}
