import chromeSandbox from '@tools/chrome-sandbox/index.js';
import idCardGenerator from '@tools/id-card-generator/index.js';

export const toolRegistry = [chromeSandbox, idCardGenerator];

export function getToolById(id) {
  return toolRegistry.find((tool) => tool.id === id);
}

export function getActiveTools() {
  return toolRegistry.filter((tool) => !tool.disabled);
}
