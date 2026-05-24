import { spawn } from 'child_process';
import { detectChromePath } from './detector.js';
import { registerProcess, findRunningPid } from './process-manager.js';
import { getFreePort } from './developer-mode.js';
import { logger } from '../utils/logger.js';

export async function launchChrome({
  sandboxId,
  userDataDir,
  profileDirectory = 'Default',
  extensionPath = null,
  windowPosition = { x: 100, y: 100 },
  windowSize = { width: 1280, height: 800 },
  enableDeveloperMode = false,
}) {
  const chromePath = await detectChromePath();
  const debugPort = enableDeveloperMode ? await getFreePort() : null;

  const args = [
    `--user-data-dir=${userDataDir}`,
    `--profile-directory=${profileDirectory}`,
    '--restore-last-session',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-default-apps',
    `--window-size=${windowSize.width},${windowSize.height}`,
  ];

  if (debugPort) {
    args.push(`--remote-debugging-port=${debugPort}`);
    args.push('--start-minimized');
    args.push('--window-position=-32000,-32000');
  } else {
    args.push(`--window-position=${windowPosition.x},${windowPosition.y}`);
  }

  if (extensionPath) {
    args.push(`--load-extension=${extensionPath}`);
  }

  logger.info('Launching Chrome', { sandboxId, chromePath, userDataDir, profileDirectory, debugPort });

  const child = spawn(chromePath, args, {
    detached: false,
    stdio: 'ignore',
    windowsHide: false,
  });

  registerProcess(sandboxId, child, userDataDir);
  const pid = findRunningPid(sandboxId, userDataDir) || child.pid;
  return { pid, debugPort };
}
