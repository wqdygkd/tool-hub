import { useRouter, useRoute } from 'vue-router';
import { computed } from 'vue';

export function useNavigation() {
  const router = useRouter();
  const route = useRoute();

  function goToHome() {
    router.push({ name: 'home' });
  }

  function goToTool(toolId) {
    router.push({ name: `tool-${toolId}` });
  }

  function goBack() {
    if (route.meta?.toolId) {
      goToHome();
    } else {
      router.back();
    }
  }

  const currentTool = computed(() => route.meta?.toolId || null);
  const isHome = computed(() => route.name === 'home');

  return { goToHome, goToTool, goBack, currentTool, isHome };
}