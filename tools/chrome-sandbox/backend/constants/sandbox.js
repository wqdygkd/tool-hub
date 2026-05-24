export const DEFAULT_SANDBOX_ID = 'sandbox_default';

export const SANDBOX_COLORS = {
  sandbox: '#409EFF',
  defaultInstance: '#E6A23C',
};

export function isDefaultSandbox(sandbox) {
  return sandbox?.id === DEFAULT_SANDBOX_ID || sandbox?.metadata?.isDefault === true;
}

export function formatSandboxStatus(status) {
  return status === 'running' ? '运行中' : '已停止';
}
