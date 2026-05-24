import { ElMessage } from 'element-plus';
import { invokeIpc, ipcChannels } from '@renderer/shared/composables/useIpc.js';

export function useDataDirectoryPicker() {
  const channels = ipcChannels();

  async function browseDataDirectory() {
    try {
      return await invokeIpc(channels.CONFIG_SELECT_DATA_DIRECTORY);
    } catch (error) {
      ElMessage.error(error.message || '选择目录失败');
      return null;
    }
  }

  return { browseDataDirectory };
}
