import chromeSandbox from '@tools/chrome-sandbox/index.js';
import idCardGenerator from '@tools/id-card-generator/index.js';
import cdpInjector from '@tools/cdp-injector/index.js';

export const toolRegistry = [chromeSandbox, cdpInjector, idCardGenerator];

export function getToolById(id) {
  return toolRegistry.find((tool) => tool.id === id);
}

export function getActiveTools() {
  return toolRegistry.filter((tool) => !tool.disabled);
}
