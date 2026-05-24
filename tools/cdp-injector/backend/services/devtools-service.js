import { BrowserWindow, shell } from 'electron';
import { injectorService } from './injector-service.js';
import { isAllowedDevToolsUrl } from './cdp-client.js';
import { sleep } from '../utils/sleep.js';
import { logger } from '../../../chrome-sandbox/backend/utils/logger.js';

const devtoolsWindows = new Map();
const pauseCountByPort = new Map();

const DEVTOOLS_WINDOW_OPTIONS = {
  width: 1280,
  height: 900,
  minWidth: 800,
  minHeight: 500,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
  },
};

export function extractPortFromDevToolsUrl(devToolsUrl) {
  const match = devToolsUrl.match(/^https?:\/\/(?:127\.0\.0\.1|localhost):(\d+)\//);
  return match ? Number(match[1]) : null;
}

function retainPause(port) {
  pauseCountByPort.set(port, (pauseCountByPort.get(port) ?? 0) + 1);
}

function releasePause(port) {
  const current = pauseCountByPort.get(port) ?? 0;
  if (current <= 0) return;

  if (current === 1) {
    pauseCountByPort.delete(port);
    injectorService.resumeByPort(port);
    return;
  }

  pauseCountByPort.set(port, current - 1);
}

async function pauseInjection(port) {
  if (!port) return;
  retainPause(port);
  await injectorService.pauseByPort(port);
  await sleep(200);
}

function assertDevToolsUrl(devToolsUrl) {
  if (!isAllowedDevToolsUrl(devToolsUrl)) {
    throw new Error('无效的 DevTools 地址');
  }
}

export async function openDevToolsWindow(devToolsUrl, title = 'CDP DevTools') {
  assertDevToolsUrl(devToolsUrl);

  const existing = devtoolsWindows.get(devToolsUrl);
  if (existing && !existing.isDestroyed()) {
    existing.focus();
    return { reused: true };
  }

  const port = extractPortFromDevToolsUrl(devToolsUrl);
  await pauseInjection(port);

  const win = new BrowserWindow({ ...DEVTOOLS_WINDOW_OPTIONS, title });
  devtoolsWindows.set(devToolsUrl, win);

  win.on('closed', () => {
    devtoolsWindows.delete(devToolsUrl);
    releasePause(port);
  });

  try {
    await win.loadURL(devToolsUrl);
    logger.info('cdp:devtools opened', { devToolsUrl, port });
    return { reused: false };
  } catch (error) {
    if (!win.isDestroyed()) {
      win.close();
    }
    devtoolsWindows.delete(devToolsUrl);
    releasePause(port);
    throw error;
  }
}

export function openDevToolsIndex(port, title = 'CDP 调试入口') {
  return openDevToolsWindow(`http://127.0.0.1:${port}/`, title);
}

export async function openDevToolsExternal(devToolsUrl) {
  assertDevToolsUrl(devToolsUrl);

  const port = extractPortFromDevToolsUrl(devToolsUrl);
  await pauseInjection(port);
  await shell.openExternal(devToolsUrl);

  if (port) {
    setTimeout(() => releasePause(port), 30000);
  }
}

export function parseOpenDevToolsPayload(payload) {
  if (typeof payload === 'string') {
    return { devToolsUrl: payload, title: undefined, external: false, port: null };
  }

  return {
    devToolsUrl: payload?.devToolsUrl,
    title: payload?.title,
    external: payload?.external === true,
    port: payload?.port ?? null,
  };
}

export async function openDevToolsFromPayload(payload) {
  const { devToolsUrl, title, external, port } = parseOpenDevToolsPayload(payload);

  if (port && !devToolsUrl) {
    return openDevToolsIndex(port, title ?? `CDP 调试入口 · ${port}`);
  }

  if (external) {
    await openDevToolsExternal(devToolsUrl);
  } else {
    await openDevToolsWindow(devToolsUrl, title);
  }

  return true;
}
