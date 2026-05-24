import SessionBoxPage from './renderer/pages/SessionBox.vue';

export default {
  id: 'sessionbox',
  name: 'SessionBox',
  description: '多沙箱浏览器管理',
  version: '1.0.0',
  color: '#3b82f6',
  route: {
    path: 'sessionbox',
    name: 'tool-sessionbox',
    component: SessionBoxPage,
    meta: { toolId: 'sessionbox' },
  },
};