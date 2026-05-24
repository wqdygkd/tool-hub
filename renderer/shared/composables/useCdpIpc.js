export function getCdpInjectorApi() {
  const api = window.cdpInjector;
  if (!api) {
    throw new Error('未检测到 CDP 注入 IPC，请通过 pnpm dev 或 pnpm start 启动 Tool Hub');
  }
  return api;
}

export function cdpIpcChannels() {
  return getCdpInjectorApi().channels;
}

export function invokeCdpIpc(channel, ...args) {
  return getCdpInjectorApi().invoke(channel, ...args);
}

export function onCdpIpc(channel, callback) {
  return getCdpInjectorApi().on(channel, callback);
}
