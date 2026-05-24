import { computed } from 'vue';

export function useDialogVisible(props, emit) {
  return computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
  });
}
