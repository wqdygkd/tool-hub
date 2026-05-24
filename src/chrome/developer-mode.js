import path from 'path';
import fs from 'fs-extra';
import net from 'net';
import { readJsonFile } from '../utils/file-ops.js';
import { getSandboxProfilePath } from '../utils/path-helper.js';
import { logger } from '../utils/logger.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

export async function shouldSkipDeveloperModeSetup(sandbox) {
  if (sandbox.metadata?.developerModeEnabled) return true;

  const profilePath = getSandboxProfilePath(sandbox.id);
  const sessionsDir = path.join(profilePath, 'Sessions');
  if (!await fs.pathExists(sessionsDir)) return false;

  const files = await fs.readdir(sessionsDir);
  if (!files.some((file) => file.startsWith('Session_'))) return false;

  const prefs = await readJsonFile(path.join(profilePath, 'Secure Preferences'), {});
  return prefs?.extensions?.ui?.developer_mode === true;
}

async function waitForCdp(port, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return true;
    } catch {
      // Chrome still starting
    }
    await sleep(300);
  }
  return false;
}

async function cdpCall(wsUrl, method, params = {}) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  const id = 1;
  return new Promise((resolve, reject) => {
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      ws.close();
      if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
      else resolve(message.result);
    });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function cdpEval(wsUrl, expression) {
  const result = await cdpCall(wsUrl, 'Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result?.result?.value;
}

async function getBrowserWsUrl(port) {
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  return version.webSocketDebuggerUrl;
}

async function listPageTargets(port) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  return list.filter((item) => item.type === 'page');
}

async function waitForExtensionsTarget(port, targetId, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const pages = await listPageTargets(port);
    const target = pages.find((item) => item.id === targetId)
      || pages.find((item) => item.url?.startsWith('chrome://extensions'));
    if (target?.webSocketDebuggerUrl) return target;
    await sleep(200);
  }
  return null;
}

async function createBackgroundExtensionsTab(port) {
  const browserWsUrl = await getBrowserWsUrl(port);
  const { targetId } = await cdpCall(browserWsUrl, 'Target.createTarget', {
    url: 'chrome://extensions/',
    background: true,
  });

  const target = await waitForExtensionsTarget(port, targetId);
  if (!target?.webSocketDebuggerUrl) {
    throw new Error('Background extensions tab not found');
  }

  return {
    targetId: target.id || targetId,
    wsUrl: target.webSocketDebuggerUrl,
    browserWsUrl,
  };
}

async function waitForExtensionsTabsClosed(port, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const pages = await listPageTargets(port);
    if (!pages.some((item) => item.url?.startsWith('chrome://extensions'))) return;
    await sleep(100);
  }
}

async function closeExtensionsTab(port, browserWsUrl, targetId) {
  try {
    await cdpCall(browserWsUrl, 'Target.closeTarget', { targetId });
  } catch {
    // ignore
  }

  await waitForExtensionsTabsClosed(port);

  for (const item of await listPageTargets(port)) {
    if (item.url?.startsWith('chrome://extensions')) {
      await fetch(`http://127.0.0.1:${port}/json/close/${encodeURIComponent(item.id)}`);
    }
  }
  await waitForExtensionsTabsClosed(port);
}

async function restoreChromeWindow(port, { x, y, width, height }) {
  try {
    const browserWsUrl = await getBrowserWsUrl(port);
    const pages = await listPageTargets(port);
    const page = pages.find((item) => !item.url?.startsWith('chrome://extensions')) || pages[0];
    if (!page) return;

    const { windowId } = await cdpCall(browserWsUrl, 'Browser.getWindowForTarget', {
      targetId: page.id,
    });

    await cdpCall(browserWsUrl, 'Browser.setWindowBounds', {
      windowId,
      bounds: { left: x, top: y, width, height, windowState: 'normal' },
    });
  } catch (error) {
    logger.warn('Failed to restore Chrome window bounds', { error: error.message });
  }
}

const TOGGLE_SCRIPT = `(enable) => {
  const toggle = document.querySelector('extensions-manager')?.shadowRoot
    ?.querySelector('extensions-toolbar')?.shadowRoot?.querySelector('#devMode');
  if (!toggle) return { found: false, checked: false };
  if (enable && !toggle.checked) toggle.click();
  return { found: true, checked: !!toggle.checked };
}`;

async function enableDeveloperModeOnTab(wsUrl) {
  const deadline = Date.now() + 10000;
  let state = { found: false, checked: false };

  while (Date.now() < deadline) {
    state = await cdpEval(wsUrl, `(${TOGGLE_SCRIPT})(false)`) || state;
    if (state.found) break;
    await sleep(300);
  }

  if (state.found && state.checked) {
    logger.info('Extensions developer mode already enabled');
    return true;
  }
  if (!state.found) {
    logger.warn('Developer mode toggle not found on chrome://extensions');
    return false;
  }

  await cdpEval(wsUrl, `(${TOGGLE_SCRIPT})(true)`);
  await sleep(500);

  const verified = await cdpEval(wsUrl, `(${TOGGLE_SCRIPT})(false)`);
  if (verified?.found && verified.checked) {
    logger.info('Extensions developer mode enabled via CDP');
    return true;
  }

  logger.warn('Failed to enable extensions developer mode via CDP', { state, verified });
  return false;
}

export async function setupSandboxDeveloperMode(debugPort, windowBounds) {
  if (!debugPort || !await waitForCdp(debugPort)) {
    if (debugPort) logger.warn('CDP not ready, skip developer mode enable', { debugPort });
    return false;
  }

  let tab = null;
  try {
    tab = await createBackgroundExtensionsTab(debugPort);
    return await enableDeveloperModeOnTab(tab.wsUrl);
  } catch (error) {
    logger.warn('Developer mode CDP flow failed', { error: error.message });
    return false;
  } finally {
    if (tab) await closeExtensionsTab(debugPort, tab.browserWsUrl, tab.targetId);
    if (windowBounds) await restoreChromeWindow(debugPort, windowBounds);
  }
}
