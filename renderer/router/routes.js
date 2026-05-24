import HomePage from '../pages/HomePage.vue';
import ToolLayout from '../layouts/ToolLayout.vue';
import chromeSandbox from '@tools/chrome-sandbox/index.js';

export const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
    meta: { title: '工具中心' },
  },
  {
    path: '/tools',
    component: ToolLayout,
    children: [
      chromeSandbox.route,
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];