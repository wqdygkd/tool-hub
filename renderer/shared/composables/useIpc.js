export function getSessionboxApi() {
  const api = window.sessionbox;
  if (!api) {
    throw new Error('未检测到 Electron IPC，请通过 pnpm dev 或 pnpm start 启动 SessionBox');
  }
  return api;
}

export function ipcChannels() {
  return getSessionboxApi().channels;
}

export function invokeIpc(channel, ...args) {
  return getSessionboxApi().invoke(channel, ...args);
}

export function onIpc(channel, callback) {
  return getSessionboxApi().on(channel, callback);
}
