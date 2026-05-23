import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { invokeIpc, ipcChannels } from '../composables/useIpc.js';

export const useSandboxStore = defineStore('sandbox', () => {
  const sandboxes = ref([]);
  const selectedId = ref(null);
  const fingerprint = ref(null);
  const extensions = ref([]);

  const selectedSandbox = computed(() => sandboxes.value.find((s) => s.id === selectedId.value) || null);
  const channels = () => ipcChannels();

  async function loadAll() {
    sandboxes.value = await invokeIpc(channels().SANDBOX_GET_ALL);
    if (!selectedId.value && sandboxes.value.length > 0) {
      selectedId.value = sandboxes.value[0].id;
    }
  }

  function select(id) {
    selectedId.value = id;
  }

  async function create(data) {
    const sandbox = await invokeIpc(channels().SANDBOX_CREATE, data);
    await loadAll();
    selectedId.value = sandbox.id;
    return sandbox;
  }

  async function activate(id) {
    await invokeIpc(channels().SANDBOX_ACTIVATE, id);
    await loadAll();
  }

  async function close(id) {
    await invokeIpc(channels().SANDBOX_CLOSE, id);
    await loadAll();
  }

  async function remove(id) {
    await invokeIpc(channels().SANDBOX_DELETE, id);
    if (selectedId.value === id) selectedId.value = null;
    await loadAll();
  }

  async function update(id, data) {
    await invokeIpc(channels().SANDBOX_UPDATE, id, data);
    await loadAll();
  }

  async function loadFingerprint(sandboxId) {
    const sandbox = sandboxes.value.find((s) => s.id === sandboxId);
    if (!sandbox?.fingerprintId) {
      fingerprint.value = null;
      return;
    }
    fingerprint.value = await invokeIpc(channels().FINGERPRINT_GET_BY_ID, sandbox.fingerprintId);
  }

  async function loadExtensions(sandboxId) {
    extensions.value = await invokeIpc(channels().EXTENSION_GET_ALL, sandboxId);
  }

  return {
    sandboxes,
    selectedId,
    selectedSandbox,
    fingerprint,
    extensions,
    loadAll,
    select,
    create,
    activate,
    close,
    remove,
    update,
    loadFingerprint,
    loadExtensions,
  };
});
