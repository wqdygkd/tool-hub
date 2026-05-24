import ChromeSandboxPage from './renderer/pages/ChromeSandbox.vue';

export default {
  id: 'chrome-sandbox',
  name: 'Chrome沙箱',
  description: '多沙箱浏览器管理',
  version: '1.0.0',
  color: '#3b82f6',
  route: {
    path: 'chrome-sandbox',
    name: 'tool-chrome-sandbox',
    component: ChromeSandboxPage,
    meta: { toolId: 'chrome-sandbox' },
  },
};
