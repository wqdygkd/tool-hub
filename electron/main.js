import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import { registerIpcHandlers } from '../tools/chrome-sandbox/backend/ipc/handlers.js';
import { getDatabase, closeDatabase } from '../tools/chrome-sandbox/backend/store/database.js';
import { loadDataDirectoryOverride, getDataDirectory } from '../tools/chrome-sandbox/backend/utils/path-helper.js';
import { logger } from '../tools/chrome-sandbox/backend/utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Use app.isPackaged for reliable detection (NODE_ENV may not be set in packaged apps)
const isDev = !app.isPackaged;

let mainWindow = null;

async function createWindow() {
  await loadDataDirectoryOverride();
  await fs.ensureDir(getDataDirectory());
  getDatabase();
  registerIpcHandlers();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 800,
    minHeight: 500,
    title: 'Chrome沙箱',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  closeDatabase();
  logger.info('Application quitting');
});
