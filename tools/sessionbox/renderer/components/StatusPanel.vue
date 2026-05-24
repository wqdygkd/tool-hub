<template>
  <section class="status-panel">
    <template v-if="sandbox">
      <ActionBar
        :running="sandbox.status === 'running'"
        :name="sandbox.name"
        :is-default="isDefault"
        @activate="$emit('activate')"
        @close="$emit('close')"
        @delete="$emit('delete')"
        @rename="$emit('rename', $event)"
        @edit-fingerprint="$emit('edit-fingerprint')"
      />

      <div class="panel-header">
        <h2>{{ sandbox.name }}</h2>
        <el-tag v-if="isDefault" type="warning" size="small">默认实例</el-tag>
        <el-tag :type="sandbox.status === 'running' ? 'success' : 'info'" size="small">
          {{ formatSandboxStatus(sandbox.status) }}
        </el-tag>
      </div>

      <el-alert
        v-if="isDefault"
        type="info"
        :closable="false"
        show-icon
        title="使用系统 Chrome 用户数据"
        description="直接打开您日常使用的 Chrome Profile，保留登录状态、书签、历史记录和已安装插件，不会注入指纹伪造扩展。"
        class="default-alert"
      />

      <div class="detail-grid">
        <div class="detail-item"><span>状态</span><strong>{{ sandbox.status }}</strong></div>
        <div class="detail-item"><span>PID</span><strong>{{ sandbox.chromePid || '-' }}</strong></div>
        <div class="detail-item"><span>内存</span><strong>{{ sandbox.memoryUsage || 0 }} MB</strong></div>
        <div class="detail-item"><span>路径</span><strong class="path">{{ sandbox.userDataPath }}</strong></div>
      </div>

      <div v-if="!isDefault" class="section-block">
        <h3>指纹状态</h3>
        <div v-if="fingerprint" class="fingerprint-summary">
          <p>UA: {{ fingerprint.navigator?.userAgent?.slice(0, 60) }}...</p>
          <p>Platform: {{ fingerprint.navigator?.platform }} | 分辨率: {{ fingerprint.screen?.width }}x{{ fingerprint.screen?.height }}</p>
          <p>Canvas: {{ fingerprint.canvas?.noiseLevel }} | WebGL: {{ fingerprint.webgl?.vendor }}</p>
        </div>
        <p v-else class="muted">暂无指纹信息</p>
      </div>
    </template>

    <div v-else class="empty-panel">
      <p>请选择一个沙箱，或创建新沙箱</p>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import ActionBar from './ActionBar.vue';
import { isDefaultSandbox, formatSandboxStatus } from '../shared/sandbox.js';

const props = defineProps({
  sandbox: { type: Object, default: null },
  fingerprint: { type: Object, default: null },
});

defineEmits(['activate', 'close', 'delete', 'rename', 'edit-fingerprint']);

const isDefault = computed(() => isDefaultSandbox(props.sandbox));
</script>

<style scoped>
.default-alert {
  margin-bottom: var(--spacing-lg);
}
</style>
