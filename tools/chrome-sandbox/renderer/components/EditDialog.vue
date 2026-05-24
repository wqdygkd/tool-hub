<template>
  <el-dialog v-model="visible" title="编辑沙箱设置" width="420px" @close="reset">
    <el-form :model="form" label-width="120px">
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
      <el-button type="primary" :loading="loading" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useSandboxStore } from '../stores/sandboxStore.js';
import { useDialogVisible } from '@renderer/shared/composables/useDialogVisible.js';

const props = defineProps({
  modelValue: Boolean,
  sandbox: { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue']);

const store = useSandboxStore();
const loading = ref(false);
const form = reactive({
  disableSafetyChecks: false,
  disableCors: false,
  enableCustomArgs: false,
  customArgs: '',
});
const visible = useDialogVisible(props, emit);

watch(visible, (open) => {
  if (open && props.sandbox?.metadata?.launchOptions) {
    const opts = props.sandbox.metadata.launchOptions;
    form.disableSafetyChecks = opts.disableSafetyChecks || false;
    form.disableCors = opts.disableCors || false;
    form.enableCustomArgs = Boolean(opts.customArgs);
    form.customArgs = opts.customArgs || '';
  }
});

function reset() {
  form.disableSafetyChecks = false;
  form.disableCors = false;
  form.enableCustomArgs = false;
  form.customArgs = '';
}

async function save() {
  if (!props.sandbox) return;

  loading.value = true;
  try {
    const launchOptions = {
      disableSafetyChecks: form.disableSafetyChecks,
      disableCors: form.disableCors,
      customArgs: form.enableCustomArgs ? form.customArgs.trim() : '',
    };

    const currentMetadata = props.sandbox.metadata || {};
    await store.update(props.sandbox.id, {
      metadata: {
        ...currentMetadata,
        launchOptions,
      },
    });

    ElMessage.success('设置已保存');
    visible.value = false;
    reset();
  } catch (error) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.launch-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.custom-args-input {
  margin-top: 4px;
}
</style>