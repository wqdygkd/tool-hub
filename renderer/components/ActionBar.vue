<template>
  <div class="action-bar">
    <el-button type="primary" @click="$emit('activate')">
      {{ running ? '激活窗口' : (isDefault ? '启动 Chrome' : '启动沙箱') }}
    </el-button>
    <el-button :disabled="!running" @click="$emit('close')">关闭</el-button>
    <el-button @click="rename">重命名</el-button>
    <el-button v-if="!isDefault" @click="$emit('edit-fingerprint')">编辑指纹</el-button>
    <el-button @click="$emit('manage-extensions')">管理插件</el-button>
    <el-button v-if="!isDefault" type="danger" plain @click="confirmDelete">删除</el-button>
  </div>
</template>

<script setup>
import { ElMessageBox } from 'element-plus';

const props = defineProps({
  running: { type: Boolean, default: false },
  name: { type: String, default: '' },
  isDefault: { type: Boolean, default: false },
});

const emit = defineEmits(['activate', 'close', 'delete', 'edit-fingerprint', 'manage-extensions', 'rename']);

async function rename() {
  try {
    const { value } = await ElMessageBox.prompt('请输入新的名称', '重命名', {
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      inputValue: props.name,
      inputPattern: /\S+/,
      inputErrorMessage: '名称不能为空',
    });
    if (value?.trim()) {
      emit('rename', value.trim());
    }
  } catch {
    // cancelled
  }
}

async function confirmDelete() {
  try {
    await ElMessageBox.confirm('确定删除该沙箱？此操作不可恢复。', '删除确认', { type: 'warning' });
    emit('delete');
  } catch {
    // cancelled
  }
}
</script>
