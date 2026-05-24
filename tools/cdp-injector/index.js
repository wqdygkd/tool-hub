import CdpInjectorPage from './renderer/pages/CdpInjector.vue';

export default {
  id: 'cdp-injector',
  name: 'CDP 脚本注入',
  description: '批量启动应用并通过调试端口注入自定义脚本',
  version: '1.0.0',
  color: '#10b981',
  route: {
    path: 'cdp-injector',
    name: 'tool-cdp-injector',
    component: CdpInjectorPage,
    meta: { toolId: 'cdp-injector' },
  },
};
