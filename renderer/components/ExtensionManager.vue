<template>
  <el-dialog v-model="visible" title="插件管理" width="560px">
    <el-table :data="extensions" style="width: 100%">
      <el-table-column prop="extensionName" label="名称" />
      <el-table-column prop="extensionId" label="ID" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-switch
            :model-value="row.enabled"
            @change="(value) => toggle(row, value)"
          />
        </template>
      </el-table-column>
    </el-table>
  </el-dialog>
</template>

<script setup>
import { ElMessage } from 'element-plus';
import { invokeIpc, ipcChannels } from '../composables/useIpc.js';
import { useDialogVisible } from '../composables/useDialogVisible.js';

const props = defineProps({
  modelValue: Boolean,
  sandboxId: { type: String, default: null },
  extensions: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue', 'refresh']);

const visible = useDialogVisible(props, emit);
const channels = ipcChannels();

async function toggle(row, enabled) {
  if (!props.sandboxId) return;
  try {
    await invokeIpc(channels.EXTENSION_TOGGLE, props.sandboxId, row.extensionId, enabled);
    emit('refresh');
  } catch (error) {
    ElMessage.error(error.message || '操作失败');
  }
}
</script>
