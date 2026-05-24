<template>
  <div class="sandbox-card" :class="{ active, default: isDefault }" @click="$emit('click')">
    <div class="card-header">
      <span class="color-dot" :style="{ background: sandbox.color }" />
      <span class="name">{{ sandbox.name }}</span>
      <el-tag v-if="isDefault" size="small" type="warning" effect="plain">默认</el-tag>
    </div>
    <div class="card-meta">
      <span class="status" :class="sandbox.status">{{ formatSandboxStatus(sandbox.status) }}</span>
      <span v-if="sandbox.status === 'running'" class="pid">PID: {{ sandbox.chromePid || '-' }}</span>
    </div>
    <div v-if="hasLaunchOptions" class="launch-options-tags">
      <el-tag v-if="sandbox.metadata?.launchOptions?.disableSafetyChecks" size="small" type="danger" effect="plain">
        禁用安全检查
      </el-tag>
      <el-tag v-if="sandbox.metadata?.launchOptions?.disableCors" size="small" type="danger" effect="plain">
        禁用 CORS
      </el-tag>
      <el-tag v-if="sandbox.metadata?.launchOptions?.customArgs" size="small" type="info" effect="plain">
        自定义参数
      </el-tag>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { isDefaultSandbox, formatSandboxStatus } from '../shared/sandbox.js';

const props = defineProps({
  sandbox: { type: Object, required: true },
  active: { type: Boolean, default: false },
});

defineEmits(['click']);

const isDefault = computed(() => isDefaultSandbox(props.sandbox));

const hasLaunchOptions = computed(() => {
  const opts = props.sandbox.metadata?.launchOptions;
  return opts && (opts.disableSafetyChecks || opts.disableCors || opts.customArgs);
});
</script>

<style scoped>
.sandbox-card.default {
  border-color: #f3d19e;
  background: #fdf6ec;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  font-size: 14px;
}

.launch-options-tags {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  flex-wrap: wrap;
}
</style>
