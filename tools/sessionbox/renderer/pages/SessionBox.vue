<template>
  <div class="sessionbox-page">
    <aside class="sidebar">
      <div class="sidebar-title">沙箱列表</div>
      <div class="sandbox-list">
        <SandboxCard
          v-for="sandbox in sandboxes"
          :key="sandbox.id"
          :sandbox="sandbox"
          :active="sandbox.id === selectedId"
          @click="store.select(sandbox.id)"
        />
        <div v-if="sandboxes.length === 0" class="empty-tip">暂无沙箱，点击下方创建</div>
      </div>
      <div class="sidebar-actions">
        <el-button type="primary" class="full-width" @click="showCreate = true">+ 新建沙箱</el-button>
        <el-button class="full-width" @click="showSettings = true">全局设置</el-button>
      </div>
    </aside>

    <StatusPanel
      :sandbox="selectedSandbox"
      :fingerprint="fingerprint"
      @activate="store.activate(selectedId)"
      @close="store.close(selectedId)"
      @delete="deleteSandbox"
      @rename="renameSandbox"
      @edit-fingerprint="openFingerprintEditor"
    />

    <CreateDialog v-model="showCreate" />
    <SettingsDialog v-model="showSettings" />
    <FingerprintEditor
      v-model="showFingerprint"
      :fingerprint="fingerprint"
      :sandbox-id="selectedId"
      @saved="store.loadFingerprint(selectedId)"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import SandboxCard from '../components/SandboxCard.vue';
import StatusPanel from '../components/StatusPanel.vue';
import CreateDialog from '../components/CreateDialog.vue';
import SettingsDialog from '../components/SettingsDialog.vue';
import FingerprintEditor from '../components/FingerprintEditor.vue';
import { useSandboxStore } from '../stores/sandboxStore.js';
import { isDefaultSandbox } from '../shared/sandbox.js';
import { ipcChannels, onIpc } from '@renderer/shared/composables/useIpc.js';

const store = useSandboxStore();
const showCreate = ref(false);
const showSettings = ref(false);
const showFingerprint = ref(false);

const sandboxes = computed(() => store.sandboxes);
const selectedId = computed(() => store.selectedId);
const selectedSandbox = computed(() => store.selectedSandbox);
const fingerprint = computed(() => store.fingerprint);

function openFingerprintEditor() {
  if (isDefaultSandbox(selectedSandbox.value)) {
    ElMessage.warning('默认 Chrome 实例不支持指纹伪造');
    return;
  }
  showFingerprint.value = true;
}

async function deleteSandbox() {
  if (!selectedId.value) return;
  try {
    await store.remove(selectedId.value);
  } catch (error) {
    ElMessage.error(error.message || '删除失败');
  }
}

async function renameSandbox(name) {
  if (!selectedId.value) return;
  try {
    await store.update(selectedId.value, { name });
    ElMessage.success('名称已更新');
  } catch (error) {
    ElMessage.error(error.message || '重命名失败');
  }
}

watch(selectedId, (id) => {
  if (id) {
    store.loadFingerprint(id);
  }
});

let unsubscribers = [];

onMounted(async () => {
  await store.loadAll();
  const channels = ipcChannels();
  const refresh = () => store.loadAll();
  unsubscribers = [
    onIpc(channels.EVENT_STATUS_CHANGED, refresh),
    onIpc(channels.EVENT_PROCESS_EXITED, refresh),
    onIpc(channels.EVENT_MEMORY_UPDATE, refresh),
  ];
});

onUnmounted(() => {
  unsubscribers.forEach((off) => off());
});
</script>

<style scoped>
.sessionbox-page {
  display: grid;
  grid-template-columns: 220px 1fr;
  flex: 1;
  min-height: 0;
}

.empty-tip {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  text-align: center;
  padding: var(--spacing-lg);
}
</style>