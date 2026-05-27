import { spawn, execSync, execFile, execFileSync } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WINDOWS_QUERY_SCRIPT = path.join(__dirname, 'chrome-process-query.ps1');
const EMPTY_SNAPSHOT = Object.freeze({ pids: [] });
const QUERY_CACHE_MS = 8000;

const processes = new Map();
const userDataDirs = new Map();
const queryCache = new Map();
const inFlightQueries = new Map();
let exitHandler = null;

const GRACEFUL_TIMEOUT_MS = 10000;
const POWERSHELL_QUERY_ARGS = (userDataDir) => [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  WINDOWS_QUERY_SCRIPT,
  '-UserDataDir',
  userDataDir,
];

function logWindowsQueryFailure(userDataDir, error) {
  logger.warn('Failed to query Chrome process tree on Windows', { userDataDir, error: error.message });
}

function buildUnixSnapshot(userDataDir) {
  return { pids: findUnixPidsByUserDataDir(userDataDir) };
}

function queryWindowsChromeSync(userDataDir) {
  const output = execFileSync(
    'powershell.exe',
    POWERSHELL_QUERY_ARGS(userDataDir),
    { encoding: 'utf8', timeout: 15000, windowsHide: true },
  ).trim();
  const result = parseQueryOutput(output);
  setCachedSnapshot(userDataDir, result);
  return result;
}

export function onProcessExit(handler) {
  exitHandler = handler;
}

export function invalidateChromeProcessCache(userDataDir) {
  if (userDataDir) {
    queryCache.delete(userDataDir);
  }
}

function parseQueryOutput(output) {
  if (!output) return { ...EMPTY_SNAPSHOT };

  const parsed = JSON.parse(output);
  const pids = Array.isArray(parsed.pids) ? parsed.pids : [parsed.pids].filter(Boolean);
  return {
    pids: pids.map((pid) => Number(pid)).filter(Number.isFinite),
  };
}

function getCachedSnapshot(userDataDir) {
  const entry = queryCache.get(userDataDir);
  if (entry && Date.now() - entry.at < QUERY_CACHE_MS) {
    return entry.result;
  }
  return null;
}

function setCachedSnapshot(userDataDir, result) {
  queryCache.set(userDataDir, { result, at: Date.now() });
}

function findUnixPidsByUserDataDir(userDataDir) {
  try {
    const output = execSync(`pgrep -f "${userDataDir}"`, { encoding: 'utf8' }).trim();
    if (!output) return [];
    return output.split(/\s+/).map((pid) => parseInt(pid, 10)).filter(Number.isFinite);
  } catch {
    return [];
  }
}

async function runWindowsChromeQuery(userDataDir) {
  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      POWERSHELL_QUERY_ARGS(userDataDir),
      { encoding: 'utf8', timeout: 15000, windowsHide: true },
    );
    const result = parseQueryOutput(stdout.trim());
    setCachedSnapshot(userDataDir, result);
    return result;
  } catch (error) {
    logWindowsQueryFailure(userDataDir, error);
    return { ...EMPTY_SNAPSHOT };
  }
}

export async function queryChromeSandboxProcesses(userDataDir) {
  if (!userDataDir) return { ...EMPTY_SNAPSHOT };

  if (process.platform !== 'win32') {
    return buildUnixSnapshot(userDataDir);
  }

  const cached = getCachedSnapshot(userDataDir);
  if (cached) return cached;

  const pending = inFlightQueries.get(userDataDir);
  if (pending) return pending;

  const query = runWindowsChromeQuery(userDataDir).finally(() => {
    inFlightQueries.delete(userDataDir);
  });

  inFlightQueries.set(userDataDir, query);
  return query;
}

function getChromeSandboxSnapshotSync(userDataDir) {
  if (!userDataDir) return { ...EMPTY_SNAPSHOT };

  if (process.platform !== 'win32') {
    return buildUnixSnapshot(userDataDir);
  }

  const cached = getCachedSnapshot(userDataDir);
  if (cached) return cached;

  try {
    return queryWindowsChromeSync(userDataDir);
  } catch (error) {
    logWindowsQueryFailure(userDataDir, error);
    return { ...EMPTY_SNAPSHOT };
  }
}

export function registerProcess(sandboxId, childProcess, userDataDir) {
  processes.set(sandboxId, childProcess);
  if (userDataDir) userDataDirs.set(sandboxId, userDataDir);

  childProcess.on('exit', (code, signal) => {
    logger.info('Chrome process exited', { sandboxId, code, signal });
    processes.delete(sandboxId);

    const dir = userDataDirs.get(sandboxId);
    if (dir && getChromeSandboxSnapshotSync(dir).pids.length > 0) {
      logger.info('Chrome still running for sandbox', { sandboxId });
      return;
    }

    userDataDirs.delete(sandboxId);
    if (exitHandler) exitHandler(sandboxId);
  });
}

function findPidsByUserDataDir(userDataDir) {
  return getChromeSandboxSnapshotSync(userDataDir).pids;
}

export function isRunning(sandboxId, userDataDir, { allowProcessQuery = true } = {}) {
  const proc = processes.get(sandboxId);
  if (proc != null && proc.exitCode == null && !proc.killed) {
    return true;
  }

  if (!allowProcessQuery) {
    return false;
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
    invalidateChromeProcessCache(trackedDir);
    return true;
  } catch (error) {
    logger.error('Failed to kill Chrome process', { sandboxId, error: error.message });
    return false;
  }
}
