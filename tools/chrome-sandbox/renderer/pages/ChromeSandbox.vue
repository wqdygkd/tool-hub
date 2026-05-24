<template>
  <div class="chrome-sandbox-page">
    <Sidebar
      :sandboxes="store.sandboxes"
      :selected-id="store.selectedId"
      @select="store.select"
      @create="showCreate = true"
      @settings="showSettings = true"
    />

    <StatusPanel
      :sandbox="store.selectedSandbox"
      :fingerprint="store.fingerprint"
      @activate="store.activate(store.selectedId)"
      @close="store.close(store.selectedId)"
      @delete="deleteSandbox"
      @edit-fingerprint="openFingerprintEditor"
    />

    <CreateDialog v-model="showCreate" />
    <SettingsDialog v-model="showSettings" />
    <FingerprintEditor
      v-model="showFingerprint"
      :fingerprint="store.fingerprint"
      :sandbox-id="store.selectedId"
      @saved="store.loadFingerprint(store.selectedId)"
    />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import Sidebar from '../components/Sidebar.vue';
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

function openFingerprintEditor() {
  if (isDefaultSandbox(store.selectedSandbox)) {
    ElMessage.warning('默认 Chrome 实例不支持指纹伪造');
    return;
  }
  showFingerprint.value = true;
}

async function deleteSandbox() {
  if (!store.selectedId) return;
  try {
    await store.remove(store.selectedId);
  } catch (error) {
    ElMessage.error(error.message || '删除失败');
  }
}

watch(() => store.selectedId, (id) => {
  if (id) store.loadFingerprint(id);
});

const unsubscribers = [];

onMounted(async () => {
  await store.loadAll();
  const channels = ipcChannels();
  unsubscribers.push(
    onIpc(channels.EVENT_STATUS_CHANGED, () => store.loadAll()),
    onIpc(channels.EVENT_PROCESS_EXITED, () => store.loadAll()),
    onIpc(channels.EVENT_MEMORY_UPDATE, ({ sandboxId, memoryUsage }) => {
      store.patchMemory(sandboxId, memoryUsage);
    }),
  );
});

onUnmounted(() => {
  unsubscribers.forEach((off) => off());
});
</script>

<style scoped>
.chrome-sandbox-page {
  display: grid;
  grid-template-columns: 220px 1fr;
  flex: 1;
  min-height: 0;
}
</style>
