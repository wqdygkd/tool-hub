<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="brand">
        <span class="brand-dot" />
        <span>SessionBox</span>
      </div>
      <span class="subtitle">多沙箱浏览器管理</span>
    </header>

    <main class="app-main">
      <Sidebar
        :sandboxes="sandboxes"
        :selected-id="selectedId"
        @select="store.select"
        @create="showCreate = true"
        @settings="showSettings = true"
      />
      <StatusPanel
        :sandbox="selectedSandbox"
        :fingerprint="fingerprint"
        @activate="store.activate(selectedId)"
        @close="store.close(selectedId)"
        @delete="deleteSandbox"
        @rename="renameSandbox"
        @edit-fingerprint="openFingerprintEditor"
      />
    </main>

    <footer class="app-footer">
      共 {{ sandboxes.length }} 个沙箱 | {{ runningCount }} 个运行中
      <span v-if="totalMemory">| 内存: {{ totalMemory }}MB</span>
      | v1.0.0
    </footer>

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
import Sidebar from './components/Sidebar.vue';
import StatusPanel from './components/StatusPanel.vue';
import CreateDialog from './components/CreateDialog.vue';
import SettingsDialog from './components/SettingsDialog.vue';
import FingerprintEditor from './components/FingerprintEditor.vue';
import { useSandboxStore } from './stores/sandboxStore.js';
import { isDefaultSandbox } from '@shared/constants/sandbox.js';
import { ipcChannels, onIpc } from './composables/useIpc.js';

const store = useSandboxStore();
const showCreate = ref(false);
const showSettings = ref(false);
const showFingerprint = ref(false);

const sandboxes = computed(() => store.sandboxes);
const selectedId = computed(() => store.selectedId);
const selectedSandbox = computed(() => store.selectedSandbox);
const fingerprint = computed(() => store.fingerprint);
const runningCount = computed(() => sandboxes.value.filter((s) => s.status === 'running').length);
const totalMemory = computed(() => sandboxes.value.reduce((sum, s) => sum + (s.memoryUsage || 0), 0));

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
