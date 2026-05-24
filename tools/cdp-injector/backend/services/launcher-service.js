import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const DEBUG_PORT_RE = /--remote-debugging-port(?:=|\s+)(\d+)/i;

function parseArgs(argsString = '') {
  if (!argsString.trim()) return [];
  const tokens = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = re.exec(argsString.trim())) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

function ensureDebugPort(args, port) {
  const hasPort = args.some((arg) => DEBUG_PORT_RE.test(arg));
  if (hasPort) return args;
  return [...args, `--remote-debugging-port=${port}`];
}

async function killProcessTree(pid) {
  if (!pid) return;
  if (process.platform === 'win32') {
    try {
      await execAsync(`taskkill /PID ${pid} /T /F`);
    } catch {
      // process may already exit
    }
    return;
  }
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // ignore
  }
}

export class ProcessLauncher {
  constructor() {
    /** @type {Map<string, { pid: number, child: import('child_process').ChildProcess }>} */
    this.processes = new Map();
  }

  launch(profileId, executable, argsString, debugPort) {
    if (this.processes.has(profileId)) {
      throw new Error('该配置已在运行中');
    }

    const args = ensureDebugPort(parseArgs(argsString), debugPort);
    const child = spawn(executable, args, {
      detached: false,
      stdio: 'ignore',
      windowsHide: true,
    });

    if (!child.pid) {
      throw new Error('进程启动失败');
    }

    this.processes.set(profileId, { pid: child.pid, child });

    child.on('exit', () => {
      this.processes.delete(profileId);
    });

    return { pid: child.pid, args };
  }

  async stop(profileId) {
    const entry = this.processes.get(profileId);
    if (!entry) return false;
    await killProcessTree(entry.pid);
    this.processes.delete(profileId);
    return true;
  }

  async stopAll() {
    const ids = [...this.processes.keys()];
    await Promise.all(ids.map((id) => this.stop(id)));
  }

  isRunning(profileId) {
    return this.processes.has(profileId);
  }

  getPid(profileId) {
    return this.processes.get(profileId)?.pid ?? null;
  }
}

export const processLauncher = new ProcessLauncher();
