export function getChromeSandboxApi() {
  const api = window.chromeSandbox;
  if (!api) {
    throw new Error('未检测到 Electron IPC，请通过 pnpm dev 或 pnpm start 启动 Tool Hub');
  }
  return api;
}

export function ipcChannels() {
  return getChromeSandboxApi().channels;
}

export function invokeIpc(channel, ...args) {
  return getChromeSandboxApi().invoke(channel, ...args);
}

export function onIpc(channel, callback) {
  return getChromeSandboxApi().on(channel, callback);
}
