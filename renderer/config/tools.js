import sessionbox from '@tools/sessionbox/index.js';

export const toolRegistry = [sessionbox];

export function getToolById(id) {
  return toolRegistry.find((tool) => tool.id === id);
}

export function getActiveTools() {
  return toolRegistry.filter((tool) => !tool.disabled);
}