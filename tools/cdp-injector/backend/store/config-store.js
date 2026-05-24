import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { getDataDirectory } from '../../../chrome-sandbox/backend/utils/path-helper.js';

const DEFAULT_CONFIG = {
  profiles: [],
  scripts: [],
  defaults: {
    startupDelayMs: 2000,
    pollIntervalMs: 2000,
    cdpTimeoutMs: 30000,
  },
};

function getConfigPath() {
  return path.join(getDataDirectory(), 'cdp-injector', 'config.json');
}

async function readConfig() {
  const configPath = getConfigPath();
  await fs.ensureDir(path.dirname(configPath));
  if (!(await fs.pathExists(configPath))) {
    await fs.writeJson(configPath, DEFAULT_CONFIG, { spaces: 2 });
    return structuredClone(DEFAULT_CONFIG);
  }
  const data = await fs.readJson(configPath);
  return {
    ...DEFAULT_CONFIG,
    ...data,
    profiles: data.profiles ?? [],
    scripts: data.scripts ?? [],
    defaults: { ...DEFAULT_CONFIG.defaults, ...data.defaults },
  };
}

async function writeConfig(config) {
  const configPath = getConfigPath();
  await fs.ensureDir(path.dirname(configPath));
  await fs.writeJson(configPath, config, { spaces: 2 });
  return config;
}

export const cdpConfigStore = {
  async getAll() {
    return readConfig();
  },

  async getProfiles() {
    const config = await readConfig();
    return config.profiles;
  },

  async getScripts() {
    const config = await readConfig();
    return config.scripts;
  },

  async saveProfile(profile) {
    const config = await readConfig();
    const payload = { ...profile };
    if (!payload.id) {
      payload.id = uuidv4();
      config.profiles.push(payload);
    } else {
      const index = config.profiles.findIndex((p) => p.id === payload.id);
      if (index === -1) {
        config.profiles.push(payload);
      } else {
        config.profiles[index] = { ...config.profiles[index], ...payload };
      }
    }
    await writeConfig(config);
    return payload.id ? config.profiles.find((p) => p.id === payload.id) : config.profiles.at(-1);
  },

  async deleteProfile(id) {
    const config = await readConfig();
    config.profiles = config.profiles.filter((p) => p.id !== id);
    await writeConfig(config);
    return config.profiles;
  },

  async saveScript(script) {
    const config = await readConfig();
    const payload = { ...script };
    if (!payload.id) {
      payload.id = uuidv4();
      config.scripts.push(payload);
    } else {
      const index = config.scripts.findIndex((s) => s.id === payload.id);
      if (index === -1) {
        config.scripts.push(payload);
      } else {
        config.scripts[index] = { ...config.scripts[index], ...payload };
      }
    }
    await writeConfig(config);
    return payload.id ? config.scripts.find((s) => s.id === payload.id) : config.scripts.at(-1);
  },

  async deleteScript(id) {
    const config = await readConfig();
    config.scripts = config.scripts.filter((s) => s.id !== id);
    await writeConfig(config);
    return config.scripts;
  },

  async getScriptById(id) {
    const config = await readConfig();
    return config.scripts.find((s) => s.id === id) ?? null;
  },

  async getProfileById(id) {
    const config = await readConfig();
    return config.profiles.find((p) => p.id === id) ?? null;
  },

  async getDefaults() {
    const config = await readConfig();
    return config.defaults;
  },
};
