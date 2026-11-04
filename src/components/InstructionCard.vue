<script setup lang="ts">
import type { Item } from "../domain/content";
import type { Rating } from "../domain/progress";
import RichText from "./RichText.vue";
import RatingButtons from "./RatingButtons.vue";
defineProps<{ item: Item; index: number; rating?: Rating }>();
defineEmits<{ rate: [id: string, value: Rating]; speak: [text: string] }>();
</script>
<template>
  <article class="instruction" :aria-label="item.title.text">
    <div class="card-top">
      <span class="eyebrow"
        >指令 {{ String(index + 1).padStart(2, "0") }} ·
        {{ item.title.text }}</span
      ><button
        class="play"
        @click="$emit('speak', item.en.text)"
        :aria-label="'朗读：' + item.en.text"
      >
        ▷ 朗读
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
    <details>
      <summary>发音提示与延伸表达</summary>
      <span class="small-label">发音提示 · 原稿辅助说明</span
      ><RichText :value="item.pronunciation" /><span class="small-label"
        >替换与延伸表达</span
      ><RichText :value="item.alternatives" />
    </details>
    <RatingButtons
      :model-value="rating"
      :label="item.title.text + '练习结果'"
      @update:model-value="(value) => $emit('rate', item.id, value)"
    />
  </article>
</template>
