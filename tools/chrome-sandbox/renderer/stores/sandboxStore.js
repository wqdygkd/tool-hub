import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { invokeIpc, ipcChannels } from '@renderer/shared/composables/useIpc.js';

export const useSandboxStore = defineStore('chrome-sandbox/sandbox', () => {
  const sandboxes = ref([]);
  const selectedId = ref(null);
  const fingerprint = ref(null);

  const selectedSandbox = computed(() => sandboxes.value.find((s) => s.id === selectedId.value) || null);

  async function loadAll() {
    sandboxes.value = await invokeIpc(ipcChannels().SANDBOX_GET_ALL);
    if (!selectedId.value && sandboxes.value.length > 0) {
      selectedId.value = sandboxes.value[0].id;
    }
  }

  function select(id) {
    selectedId.value = id;
  }

  async function create(data) {
    const sandbox = await invokeIpc(ipcChannels().SANDBOX_CREATE, data);
    await loadAll();
    selectedId.value = sandbox.id;
    return sandbox;
  }

  async function activate(id) {
    await invokeIpc(ipcChannels().SANDBOX_ACTIVATE, id);
    await loadAll();
  }

  async function close(id) {
    await invokeIpc(ipcChannels().SANDBOX_CLOSE, id);
    await loadAll();
  }

  async function remove(id) {
    await invokeIpc(ipcChannels().SANDBOX_DELETE, id);
    if (selectedId.value === id) selectedId.value = null;
    await loadAll();
  }

  async function update(id, data) {
    await invokeIpc(ipcChannels().SANDBOX_UPDATE, id, data);
    await loadAll();
  }

  async function loadFingerprint(sandboxId) {
    const sandbox = sandboxes.value.find((s) => s.id === sandboxId);
    if (!sandbox?.fingerprintId) {
      fingerprint.value = null;
      return;
    }
    fingerprint.value = await invokeIpc(ipcChannels().FINGERPRINT_GET_BY_ID, sandbox.fingerprintId);
  }

  return {
    sandboxes,
    selectedId,
    selectedSandbox,
    fingerprint,
    loadAll,
    select,
    create,
    activate,
    close,
    remove,
    update,
    loadFingerprint,
  };
});
