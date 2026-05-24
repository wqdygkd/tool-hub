<template>
  <el-dialog v-model="visible" title="全局设置" width="560px">
    <el-form :model="form" label-width="140px">
      <el-form-item label="Chrome 路径">
        <el-input v-model="form.chromePath" placeholder="自动检测或手动填写" />
      </el-form-item>
      <el-form-item label="数据目录">
        <div class="data-directory-row">
          <el-input v-model="form.dataDirectory" placeholder="沙箱与配置文件存储位置" />
          <el-button @click="browseDataDirectory">选择</el-button>
        </div>
        <span class="form-hint">更改后需重启应用生效；已有沙箱数据不会自动迁移到新目录。</span>
      </el-form-item>
      <el-form-item label="启动时自动恢复">
        <el-switch v-model="form.autoRestoreOnStartup" />
      </el-form-item>
      <el-form-item label="关闭时保留数据">
        <el-switch v-model="form.preserveDataOnClose" />
      </el-form-item>
      <el-form-item label="显示内存占用">
        <el-switch v-model="form.showMemoryUsage" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="detectChrome">检测 Chrome</el-button>
      <el-button type="primary" :loading="loading" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { invokeIpc, ipcChannels } from '@renderer/shared/composables/useIpc.js';
import { useDialogVisible } from '@renderer/shared/composables/useDialogVisible.js';

const props = defineProps({ modelValue: Boolean });
const emit = defineEmits(['update:modelValue']);

const loading = ref(false);
const form = reactive({
  chromePath: '',
  dataDirectory: '',
  autoRestoreOnStartup: false,
  preserveDataOnClose: true,
  showMemoryUsage: true,
});
const visible = useDialogVisible(props, emit);
const channels = ipcChannels();

async function runSettingAction(action, errorMessage) {
  try {
    return await action();
  } catch (error) {
    ElMessage.error(error.message || errorMessage);
    return null;
  }
}

watch(visible, async (open) => {
  if (open) {
    Object.assign(form, await invokeIpc(channels.CONFIG_GET));
  }
});

async function detectChrome() {
  const chromePath = await runSettingAction(
    () => invokeIpc(channels.CHROME_DETECT_PATH),
    '检测失败',
  );
  if (!chromePath) return;
  form.chromePath = chromePath;
  ElMessage.success('已检测到 Chrome');
}

async function browseDataDirectory() {
  const selected = await runSettingAction(
    () => invokeIpc(channels.CONFIG_SELECT_DATA_DIRECTORY),
    '选择目录失败',
  );
  if (selected) form.dataDirectory = selected;
}

async function save() {
  if (!form.dataDirectory.trim()) {
    ElMessage.warning('请选择或填写数据目录');
    return;
  }

  loading.value = true;
  try {
    const result = await invokeIpc(channels.CONFIG_UPDATE, { ...form });
    ElMessage.success('设置已保存');
    visible.value = false;
    if (result.requiresRestart) {
      await ElMessageBox.alert('数据目录已更改，请重启应用后生效。', '需要重启', { type: 'warning' });
    }
  } catch (error) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.data-directory-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.data-directory-row .el-input {
  flex: 1;
}

.form-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}
</style>
