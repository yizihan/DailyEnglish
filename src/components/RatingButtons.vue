<script setup lang="ts">
import { labels, type Rating } from "../domain/progress";
defineProps<{ modelValue?: Rating; parent?: boolean; label: string }>();
defineEmits<{ "update:modelValue": [value: Rating] }>();
</script>
<template>
  <div class="ratings" role="group" :aria-label="label">
    <button
      v-for="(text, key) in labels"
      :key="key"
      :aria-pressed="modelValue === key"
      :class="{ selected: modelValue === key }"
      @click="$emit('update:modelValue', key)"
    >
      {{
        parent
          ? {
              independent: "说出来了",
              prompted: "需要提示",
              again: "再练一次",
            }[key]
          : text
      }}
    </button>
  </div>
</template>
