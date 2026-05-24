<template>
  <div class="action-bar">
    <el-button type="primary" @click="$emit('activate')">
      {{ activateLabel }}
    </el-button>
    <el-button :disabled="!running" @click="$emit('close')">关闭</el-button>
    <el-button @click="$emit('edit-settings')">编辑设置</el-button>
    <el-button v-if="!isDefault" @click="$emit('edit-fingerprint')">编辑指纹</el-button>
    <el-button v-if="!isDefault" type="danger" plain @click="confirmDelete">删除</el-button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { ElMessageBox } from 'element-plus';

const props = defineProps({
  running: { type: Boolean, default: false },
  isDefault: { type: Boolean, default: false },
});

const emit = defineEmits(['activate', 'close', 'delete', 'edit-fingerprint', 'edit-settings']);

const activateLabel = computed(() => {
  if (props.running) return '激活窗口';
  if (props.isDefault) return '启动 Chrome';
  return '启动沙箱';
});

async function confirmDelete() {
  try {
    await ElMessageBox.confirm('确定删除该沙箱？此操作不可恢复。', '删除确认', { type: 'warning' });
    emit('delete');
  } catch {
    // cancelled
  }
}
</script>
