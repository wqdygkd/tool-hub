import chromeSandbox from '@tools/chrome-sandbox/index.js';

export const toolRegistry = [chromeSandbox];

export function getToolById(id) {
  return toolRegistry.find((tool) => tool.id === id);
}

export function getActiveTools() {
  return toolRegistry.filter((tool) => !tool.disabled);
}
