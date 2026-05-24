import IdCardGeneratorPage from './renderer/pages/IdCardGenerator.vue';

export default {
  id: 'id-card-generator',
  name: '身份证号生成器',
  description: '双随机生成中国大陆18位身份证号',
  version: '1.0.0',
  color: '#8b5cf6',
  route: {
    path: 'id-card-generator',
    name: 'tool-id-card-generator',
    component: IdCardGeneratorPage,
    meta: { toolId: 'id-card-generator' },
  },
};
