import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const channelsPath = path.join(rootDir, 'src/ipc/channels.js');
const preloadPath = path.join(rootDir, 'electron/preload.cjs');

async function syncChannels() {
  const channelsContent = await fs.readFile(channelsPath, 'utf-8');
  const channelsMatch = channelsContent.match(/export const IPC_CHANNELS = \{([^}]+)\}/);
  if (!channelsMatch) {
    console.error('Could not find IPC_CHANNELS in channels.js');
    process.exit(1);
  }
  const channelsBody = channelsMatch[1].trim();

  const lines = channelsBody.split('\n').map(line => line.trim());
  const indented = lines.filter(l => l.length > 0).join('\n  ');

  const preloadTemplate = `const { contextBridge, ipcRenderer } = require('electron');

// Auto-synced from src/ipc/channels.js by scripts/sync-ipc-channels.js
const IPC_CHANNELS = {
  ${indented}
};

contextBridge.exposeInMainWorld('sessionbox', {
  invoke(channel, ...args) {
    return ipcRenderer.invoke(channel, ...args);
  },
  on(channel, callback) {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  channels: IPC_CHANNELS,
});
`;

  await fs.writeFile(preloadPath, preloadTemplate);
  console.log('✓ IPC_CHANNELS synced to electron/preload.cjs');
}

syncChannels();