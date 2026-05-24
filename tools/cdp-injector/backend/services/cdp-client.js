import WebSocket from 'ws';
import { sleep } from '../utils/sleep.js';

export function buildDevToolsUrl(webSocketDebuggerUrl, port) {
  const wsPath = webSocketDebuggerUrl.replace(/^wss?:\/\//, '');
  return `http://127.0.0.1:${port}/devtools/inspector.html?ws=${wsPath}`;
}

function resolveDevToolsUrl(target, port) {
  const frontend = target.devtoolsFrontendUrl;
  if (!frontend) {
    return buildDevToolsUrl(target.webSocketDebuggerUrl, port);
  }
  if (frontend.startsWith('http://') || frontend.startsWith('https://')) {
    return frontend;
  }
  if (frontend.startsWith('/')) {
    return `http://127.0.0.1:${port}${frontend}`;
  }
  return buildDevToolsUrl(target.webSocketDebuggerUrl, port);
}

export function isAllowedDevToolsUrl(url) {
  return typeof url === 'string' && /^https?:\/\/(127\.0\.0\.1|localhost):\d+\//.test(url);
}

const DEBUGGABLE_TARGET_TYPES = new Set(['page', 'iframe']);

function mapTarget(target, port) {
  return {
    id: target.id,
    title: target.title || '(无标题)',
    url: target.url || '',
    type: target.type,
    parentId: target.parentId ?? null,
    devToolsUrl: resolveDevToolsUrl(target, port),
  };
}

async function fetchTargets(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json`);
  if (!response.ok) {
    throw new Error(`CDP /json 请求失败: ${response.status}`);
  }
  const list = await response.json();
  return list.filter((item) => DEBUGGABLE_TARGET_TYPES.has(item.type) && item.webSocketDebuggerUrl);
}

function createCdpCaller(ws) {
  let messageId = 0;
  const pending = new Map();

  ws.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!message.id || !pending.has(message.id)) return;

    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      reject(new Error(message.error.message || 'CDP 调用失败'));
      return;
    }
    resolve(message.result);
  });

  return function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++messageId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (!pending.has(id)) return;
        pending.delete(id);
        reject(new Error(`CDP 超时: ${method}`));
      }, 15000);
    });
  };
}

async function connectWebSocket(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  return ws;
}

async function injectTarget(wsUrl, scriptSource) {
  const ws = await connectWebSocket(wsUrl);
  const call = createCdpCaller(ws);
  try {
    await call('Page.enable');
    await call('Page.addScriptToEvaluateOnNewDocument', { source: scriptSource });
    await call('Runtime.evaluate', { expression: scriptSource, returnByValue: true });
  } finally {
    ws.close();
  }
}

export async function listPageTargets(port) {
  const targets = await fetchTargets(port);
  return targets.map((target) => mapTarget(target, port));
}

export async function waitForCdpPort(port, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const targets = await fetchTargets(port);
      if (targets.length > 0) {
        return targets;
      }
    } catch {
      // port not ready
    }
    await sleep(500);
  }
  throw new Error(`CDP 端口 ${port} 在 ${timeoutMs}ms 内无可用页面`);
}

export class CdpInjectionSession {
  constructor({ port, scriptSource, pollIntervalMs = 2000, onTargetsInjected }) {
    this.port = port;
    this.scriptSource = scriptSource;
    this.pollIntervalMs = pollIntervalMs;
    this.onTargetsInjected = onTargetsInjected;
    this.targetState = new Map();
    this.stopped = false;
    this.paused = false;
    this.pollTimer = null;
    this.injecting = false;
  }

  get injectedTargetCount() {
    return this.targetState.size;
  }

  async pause() {
    this.paused = true;
    while (this.injecting) {
      await sleep(50);
    }
  }

  resume() {
    this.paused = false;
  }

  async start() {
    await this.scanAndInject();
    this.pollTimer = setInterval(() => {
      this.scanAndInject().catch(() => {});
    }, this.pollIntervalMs);
  }

  async stop() {
    this.stopped = true;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.targetState.clear();
  }

  pruneInactiveTargets(activeIds) {
    for (const id of this.targetState.keys()) {
      if (!activeIds.has(id)) {
        this.targetState.delete(id);
      }
    }
  }

  needsInjection(target) {
    const prev = this.targetState.get(target.id);
    const url = target.url || '';
    return !prev || prev.url !== url;
  }

  async scanAndInject() {
    if (this.stopped || this.injecting || this.paused) return 0;

    this.injecting = true;
    try {
      const targets = await fetchTargets(this.port);
      const activeIds = new Set();
      let injectedCount = 0;

      for (const target of targets) {
        activeIds.add(target.id);
        if (!this.needsInjection(target)) continue;

        await injectTarget(target.webSocketDebuggerUrl, this.scriptSource);
        this.targetState.set(target.id, { url: target.url || '' });
        injectedCount += 1;
      }

      this.pruneInactiveTargets(activeIds);

      if (injectedCount > 0 && this.onTargetsInjected) {
        this.onTargetsInjected({ count: injectedCount, total: targets.length });
      }

      return injectedCount;
    } finally {
      this.injecting = false;
    }
  }

  async reinjectAll() {
    this.targetState.clear();
    return this.scanAndInject();
  }
}

export async function injectOnce(port, scriptSource) {
  const targets = await fetchTargets(port);
  if (targets.length === 0) {
    throw new Error('未找到可注入的 page 目标');
  }
  for (const target of targets) {
    await injectTarget(target.webSocketDebuggerUrl, scriptSource);
  }
  return targets.length;
}
