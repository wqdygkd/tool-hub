import HomePage from '../pages/HomePage.vue';
import ToolLayout from '../layouts/ToolLayout.vue';
import chromeSandbox from '@tools/chrome-sandbox/index.js';
import idCardGenerator from '@tools/id-card-generator/index.js';
import cdpInjector from '@tools/cdp-injector/index.js';

export const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
    meta: { title: 'Tool Hub' },
  },
  {
    path: '/tools',
    component: ToolLayout,
    children: [
      chromeSandbox.route,
      cdpInjector.route,
      idCardGenerator.route,
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];