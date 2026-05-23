<template>
  <el-dialog v-model="visible" title="新建沙箱" width="420px" @close="reset">
    <el-form :model="form" label-width="80px">
      <el-form-item label="名称">
        <el-input v-model="form.name" placeholder="例如：工作账号 A" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="submit">创建</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useSandboxStore } from '../stores/sandboxStore.js';
import { useDialogVisible } from '../composables/useDialogVisible.js';

const props = defineProps({ modelValue: Boolean });
const emit = defineEmits(['update:modelValue']);

const store = useSandboxStore();
const loading = ref(false);
const form = reactive({ name: '' });
const visible = useDialogVisible(props, emit);

function reset() {
  form.name = '';
}

async function submit() {
  if (!form.name.trim()) {
    ElMessage.warning('请输入沙箱名称');
    return;
  }
  loading.value = true;
  try {
    await store.create({ name: form.name.trim() });
    ElMessage.success('沙箱创建成功');
    visible.value = false;
    reset();
  } catch (error) {
    ElMessage.error(error.message || '创建失败');
  } finally {
    loading.value = false;
  }
}
</script>
