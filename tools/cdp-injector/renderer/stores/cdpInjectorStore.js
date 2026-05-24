import { defineStore } from 'pinia';
import { ref } from 'vue';
import { invokeCdpIpc, cdpIpcChannels, onCdpIpc } from '@renderer/shared/composables/useCdpIpc.js';

export const useCdpInjectorStore = defineStore('cdp-injector/store', () => {
  const profiles = ref([]);
  const scripts = ref([]);
  const running = ref([]);
  const loading = ref(false);
  const channels = cdpIpcChannels();

  async function load() {
    loading.value = true;
    try {
      const data = await invokeCdpIpc(channels.PROFILE_GET_ALL);
      profiles.value = data.profiles ?? [];
      scripts.value = data.scripts ?? [];
      running.value = await invokeCdpIpc(channels.GET_RUNNING);
    } finally {
      loading.value = false;
    }
  }

  function bindStatusEvents() {
    return onCdpIpc(channels.EVENT_STATUS_CHANGED, (payload) => {
      running.value = payload?.running ?? [];
    });
  }

  async function saveAndReload(channel, payload) {
    const saved = await invokeCdpIpc(channel, payload);
    await load();
    return saved;
  }

  return {
    profiles,
    scripts,
    running,
    loading,
    channels,
    load,
    bindStatusEvents,
    saveProfile: (profile) => saveAndReload(channels.PROFILE_SAVE, profile),
    deleteProfile: async (id) => {
      await invokeCdpIpc(channels.PROFILE_DELETE, id);
      await load();
    },
    saveScript: (script) => saveAndReload(channels.SCRIPT_SAVE, script),
    deleteScript: async (id) => {
      await invokeCdpIpc(channels.SCRIPT_DELETE, id);
      await load();
    },
    launchBatch: (profileIds) => invokeCdpIpc(channels.LAUNCH_BATCH, profileIds),
    stop: async (profileId) => {
      await invokeCdpIpc(channels.STOP, profileId);
      running.value = await invokeCdpIpc(channels.GET_RUNNING);
    },
    stopAll: async () => {
      await invokeCdpIpc(channels.STOP_ALL);
      running.value = [];
    },
    reinject: (profileId) => invokeCdpIpc(channels.REINJECT, profileId),
    fetchTargets: (port) => invokeCdpIpc(channels.GET_TARGETS, port),
    openDevTools: (payload) => invokeCdpIpc(channels.OPEN_DEVTOOLS, payload),
    getRunningState(profileId) {
      return running.value.find((item) => item.profileId === profileId);
    },
  };
});
