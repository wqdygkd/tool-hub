<template>
  <div class="home-page">
    <section class="hero-section">
      <h1>工具中心</h1>
      <p class="hero-desc">选择一个工具开始工作，或添加更多功能模块</p>
    </section>

    <section class="tools-grid">
      <ToolCard
        v-for="tool in tools"
        :key="tool.id"
        :tool="tool"
        @click="goToTool(tool.id)"
      />

      <div class="tool-card placeholder">
        <div class="placeholder-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <div class="placeholder-info">
          <h3>添加新工具</h3>
          <p>扩展更多功能模块</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import ToolCard from '../shared/components/ToolCard.vue';
import { toolRegistry } from '../config/tools.js';

const router = useRouter();
const tools = computed(() => toolRegistry);

function goToTool(toolId) {
  router.push({ name: `tool-${toolId}` });
}
</script>

<style scoped>
.home-page {
  padding: var(--spacing-2xl);
  max-width: 960px;
  margin: 0 auto;
}

.hero-section {
  text-align: center;
  margin-bottom: var(--spacing-2xl);
}

.hero-section h1 {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
}

.hero-desc {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--spacing-lg);
}

.placeholder-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: var(--color-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
}

.placeholder-info h3 {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.placeholder-info p {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}
</style>