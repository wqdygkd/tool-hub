import { spawn, execSync } from 'child_process';
import fs from 'fs';
import { logger } from '../utils/logger.js';

const processes = new Map();
const userDataDirs = new Map();
let exitHandler = null;

const GRACEFUL_TIMEOUT_MS = 10000;

export function onProcessExit(handler) {
  exitHandler = handler;
}

export function registerProcess(sandboxId, childProcess, userDataDir) {
  processes.set(sandboxId, childProcess);
  if (userDataDir) userDataDirs.set(sandboxId, userDataDir);

  childProcess.on('exit', (code, signal) => {
    logger.info('Chrome process exited', { sandboxId, code, signal });
    processes.delete(sandboxId);

    const dir = userDataDirs.get(sandboxId);
    if (dir && findPidsByUserDataDir(dir).length > 0) {
      logger.info('Chrome still running for sandbox', { sandboxId });
      return;
    }

    userDataDirs.delete(sandboxId);
    if (exitHandler) exitHandler(sandboxId);
  });
}

function findPidsByUserDataDir(userDataDir) {
  if (!userDataDir) return [];

  try {
    if (process.platform === 'win32') {
      const marker = userDataDir.replace(/\\/g, '\\\\');
      const script = [
        "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\"",
        `| Where-Object { $_.CommandLine -like '*${marker}*' }`,
        '| Select-Object -ExpandProperty ProcessId',
      ].join(' ');
      const output = execSync(`powershell -NoProfile -Command "${script}"`, { encoding: 'utf8' }).trim();
      if (!output) return [];
      return output
        .split(/\r?\n/)
        .map((line) => parseInt(line.trim(), 10))
        .filter((pid) => Number.isFinite(pid));
    }

    const output = execSync(`pgrep -f "${userDataDir}"`, { encoding: 'utf8' }).trim();
    if (!output) return [];
    return output.split(/\s+/).map((pid) => parseInt(pid, 10)).filter(Number.isFinite);
  } catch {
    return [];
  }
}

export function isRunning(sandboxId, userDataDir) {
  const proc = processes.get(sandboxId);
  if (proc != null && proc.exitCode == null && !proc.killed) {
    return true;
  }

  const dir = userDataDir || userDataDirs.get(sandboxId);
  if (dir && findPidsByUserDataDir(dir).length > 0) {
    return true;
  }

  return false;
}

export function findRunningPid(sandboxId, userDataDir) {
  const proc = processes.get(sandboxId);
  if (proc?.pid && isPidAlive(proc.pid)) {
    return proc.pid;
  }
  const pids = findPidsByUserDataDir(userDataDir);
  return pids[0] || null;
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function waitForProcessExit(childProcess, timeoutMs) {
  return new Promise((resolve) => {
    if (!childProcess || childProcess.exitCode != null || childProcess.killed) {
      resolve(true);
      return;
    }

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => finish(false), timeoutMs);
    childProcess.once('exit', () => finish(true));
  });
}

async function killPidTree(pid, force = false) {
  const args = force
    ? ['/pid', String(pid), '/T', '/F']
    : ['/pid', String(pid), '/T'];

  if (process.platform === 'win32') {
    spawn('taskkill', args, { stdio: 'ignore' });
    return;
  }

  try {
    process.kill(pid, force ? 'SIGKILL' : 'SIGTERM');
  } catch {
    // ignore
  }
}

export async function killProcess(sandboxId, userDataDir) {
  const proc = processes.get(sandboxId);
  const trackedDir = userDataDir || userDataDirs.get(sandboxId);
  const pids = new Set([
    ...(proc?.pid ? [proc.pid] : []),
    ...findPidsByUserDataDir(trackedDir),
  ]);

  if (pids.size === 0) {
    processes.delete(sandboxId);
    userDataDirs.delete(sandboxId);
    return false;
  }

  try {
    for (const pid of pids) {
      await killPidTree(pid, false);
    }

    const deadline = Date.now() + GRACEFUL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const alive = [...pids].some((pid) => isPidAlive(pid));
      if (!alive) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    for (const pid of pids) {
      if (isPidAlive(pid)) {
        logger.warn('Graceful Chrome shutdown timed out, forcing kill', { sandboxId, pid });
        await killPidTree(pid, true);
      }
    }

    if (proc) {
      await waitForProcessExit(proc, 3000);
    }

    processes.delete(sandboxId);
    userDataDirs.delete(sandboxId);
    return true;
  } catch (error) {
    logger.error('Failed to kill Chrome process', { sandboxId, error: error.message });
    return false;
  }
}

export function getMemoryUsage(pid) {
  if (!pid) return 0;

  try {
    if (process.platform === 'win32') {
      const output = execSync(
        `powershell -NoProfile -Command "(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).WorkingSet64 / 1MB"`,
        { encoding: 'utf8' }
      ).trim();
      const value = parseFloat(output);
      return Number.isFinite(value) ? Math.round(value) : 0;
    }

    const stat = fs.readFileSync(`/proc/${pid}/statm`, 'utf8');
    const pages = parseInt(stat.split(' ')[1], 10);
    return Math.round((pages * 4096) / (1024 * 1024));
  } catch {
    return 0;
  }
}
