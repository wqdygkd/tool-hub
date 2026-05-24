<template>
  <el-dialog v-model="visible" title="新建沙箱" width="420px" @close="reset">
    <el-form :model="form" label-width="120px">
      <el-form-item label="名称">
        <el-input v-model="form.name" placeholder="例如：工作账号 A" />
      </el-form-item>
      <el-form-item label="继承扩展">
        <el-switch v-model="form.inheritExtensions" />
        <span class="form-hint">开启后从默认 Chrome 复制已安装扩展（较慢、占用更多磁盘）</span>
      </el-form-item>
      <el-form-item label="启动参数">
        <div class="launch-options">
          <el-checkbox v-model="form.disableSafetyChecks">禁用安全检查</el-checkbox>
          <el-checkbox v-model="form.disableCors">禁用 CORS</el-checkbox>
          <el-checkbox v-model="form.enableCustomArgs">自定义启动参数</el-checkbox>
          <el-input
            v-if="form.enableCustomArgs"
            v-model="form.customArgs"
            placeholder="例如：--window-size=800,600"
            class="custom-args-input"
          />
        </div>
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
import { useDialogVisible } from '@renderer/shared/composables/useDialogVisible.js';

const props = defineProps({ modelValue: Boolean });
const emit = defineEmits(['update:modelValue']);

const store = useSandboxStore();
const loading = ref(false);
const form = reactive({
  name: '',
  inheritExtensions: false,
  disableSafetyChecks: false,
  disableCors: false,
  enableCustomArgs: false,
  customArgs: '',
});
const visible = useDialogVisible(props, emit);

function reset() {
  form.name = '';
  form.inheritExtensions = false;
  form.disableSafetyChecks = false;
  form.disableCors = false;
  form.enableCustomArgs = false;
  form.customArgs = '';
}

async function submit() {
  if (!form.name.trim()) {
    ElMessage.warning('请输入沙箱名称');
    return;
  }
  loading.value = true;
  try {
    await store.create({
      name: form.name.trim(),
      inheritExtensions: form.inheritExtensions,
      launchOptions: {
        disableSafetyChecks: form.disableSafetyChecks,
        disableCors: form.disableCors,
        customArgs: form.enableCustomArgs ? form.customArgs.trim() : '',
      },
    });
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

<style scoped>
.form-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.launch-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.custom-args-input {
  margin-top: 4px;
}
</style>
