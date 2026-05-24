import { ipcMain, BrowserWindow, dialog } from 'electron';
import { CDP_IPC_CHANNELS } from './channels.js';
import { cdpConfigStore } from '../store/config-store.js';
import { injectorService, setCdpStatusEmitter } from '../services/injector-service.js';
import { listPageTargets } from '../services/cdp-client.js';
import { openDevToolsFromPayload } from '../services/devtools-service.js';
import fs from 'fs-extra';

function broadcast(channel, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}

let handlersRegistered = false;

export function registerCdpInjectorHandlers() {
  if (handlersRegistered) return;
  handlersRegistered = true;
  setCdpStatusEmitter((payload) => {
    broadcast(CDP_IPC_CHANNELS.EVENT_STATUS_CHANGED, payload);
  });

  ipcMain.handle(CDP_IPC_CHANNELS.PROFILE_GET_ALL, async () => {
    const config = await cdpConfigStore.getAll();
    return { profiles: config.profiles, scripts: config.scripts, defaults: config.defaults };
  });

  ipcMain.handle(CDP_IPC_CHANNELS.PROFILE_SAVE, async (_event, profile) => {
    return cdpConfigStore.saveProfile(profile);
  });

  ipcMain.handle(CDP_IPC_CHANNELS.PROFILE_DELETE, async (_event, id) => {
    await injectorService.stopProfile(id);
    return cdpConfigStore.deleteProfile(id);
  });

  ipcMain.handle(CDP_IPC_CHANNELS.SCRIPT_GET_ALL, async () => cdpConfigStore.getScripts());

  ipcMain.handle(CDP_IPC_CHANNELS.SCRIPT_SAVE, async (_event, script) => {
    return cdpConfigStore.saveScript(script);
  });

  ipcMain.handle(CDP_IPC_CHANNELS.SCRIPT_DELETE, async (_event, id) => {
    return cdpConfigStore.deleteScript(id);
  });

  ipcMain.handle(CDP_IPC_CHANNELS.SELECT_EXECUTABLE, async () => {
    const result = await dialog.showOpenDialog({
      title: '选择可执行文件',
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(CDP_IPC_CHANNELS.SELECT_SCRIPT_FILE, async () => {
    const result = await dialog.showOpenDialog({
      title: '选择脚本文件',
      properties: ['openFile'],
      filters: [{ name: 'JavaScript', extensions: ['js', 'mjs', 'cjs', 'txt'] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const filePath = result.filePaths[0];
    const content = await fs.readFile(filePath, 'utf-8');
    return { filePath, content };
  });

  ipcMain.handle(CDP_IPC_CHANNELS.LAUNCH, async (_event, profileId) => {
    return injectorService.launchProfile(profileId);
  });

  ipcMain.handle(CDP_IPC_CHANNELS.LAUNCH_BATCH, async (_event, profileIds) => {
    return injectorService.launchBatch(profileIds);
  });

  ipcMain.handle(CDP_IPC_CHANNELS.STOP, async (_event, profileId) => {
    return injectorService.stopProfile(profileId);
  });

  ipcMain.handle(CDP_IPC_CHANNELS.STOP_ALL, async () => injectorService.stopAll());

  ipcMain.handle(CDP_IPC_CHANNELS.GET_RUNNING, async () => injectorService.getRunning());

  ipcMain.handle(CDP_IPC_CHANNELS.REINJECT, async (_event, profileId) => {
    return injectorService.reinjectProfile(profileId);
  });

  ipcMain.handle(CDP_IPC_CHANNELS.GET_TARGETS, async (_event, port) => {
    return listPageTargets(port);
  });

  ipcMain.handle(CDP_IPC_CHANNELS.OPEN_DEVTOOLS, async (_event, payload) => {
    return openDevToolsFromPayload(payload);
  });
}
