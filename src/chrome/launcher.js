import { spawn } from 'child_process';
import { detectChromePath } from './detector.js';
import { registerProcess, findRunningPid } from './process-manager.js';
import { logger } from '../utils/logger.js';

export async function launchChrome({
  sandboxId,
  userDataDir,
  extensionPath = null,
  windowPosition = { x: 100, y: 100 },
  windowSize = { width: 1280, height: 800 },
}) {
  const chromePath = await detectChromePath();

  const args = [
    `--user-data-dir=${userDataDir}`,
    '--profile-directory=Default',
    '--restore-last-session',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-default-apps',
    `--window-position=${windowPosition.x},${windowPosition.y}`,
    `--window-size=${windowSize.width},${windowSize.height}`,
  ];

  if (extensionPath) {
    args.push(`--load-extension=${extensionPath}`);
  }

  logger.info('Launching Chrome', { sandboxId, chromePath, userDataDir });

  const child = spawn(chromePath, args, {
    detached: false,
    stdio: 'ignore',
    windowsHide: false,
  });

  registerProcess(sandboxId, child, userDataDir);
  return findRunningPid(sandboxId, userDataDir) || child.pid;
}
