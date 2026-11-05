<script setup lang="ts">
import type { Item } from "../domain/content";
import RichText from "./RichText.vue";
defineProps<{ item: Item; index: number; activeId?: string }>();
defineEmits<{ speak: [text: string, id: string] }>();
</script>
<template>
  <article class="instruction" :aria-label="item.title.text">
    <div class="card-top">
      <span class="eyebrow"
        >指令 {{ String(index + 1).padStart(2, "0") }} ·
        {{ item.title.text }}</span
      ><button
        class="play"
        @click="$emit('speak', item.en.text, item.id)"
        :aria-label="(activeId === item.id ? '停止朗读：' : '朗读：') + item.en.text"
      >
        {{ activeId === item.id ? "停止" : "▷ 朗读" }}
      </button>
    </div>
    <RichText :value="item.en" lang="en" class="english" /><RichText
      :value="item.zh"
      class="translation"
    />
    <div class="action">
      <span class="small-label">一起做动作</span
      ><RichText :value="item.action" />
    </div>
    <div class="instruction-notes">
      <span class="small-label">发音提示 · 原稿辅助说明</span
      ><RichText :value="item.pronunciation" /><span class="small-label"
        >替换与延伸表达</span
      ><RichText :value="item.alternatives" />
    </div>
  </article>
</template>
