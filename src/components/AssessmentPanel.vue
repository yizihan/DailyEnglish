<script setup lang="ts">
import type { Task } from "../domain/content";
import RichText from "./RichText.vue";
defineProps<{
  tasks: Task[];
  parent?: boolean;
  activeId?: string;
}>();
defineEmits<{ speak: [text: string, id: string] }>();
</script>
<template>
  <section class="assessment">
    <div class="section-heading">
      <span class="eyebrow">{{ parent ? "FOR PARENTS" : "LISTEN & DO" }}</span>
      <h2>{{ parent ? "家长情景表达" : "孩子听音做动作" }}</h2>
      <p>
        {{
          parent
            ? "先看中文，试着说出英文，再展开参考答案。"
            : "家长说英文，少用手势，观察孩子能否照做。"
        }}
      </p>
    </div>
    <article class="task" v-for="(task, index) in tasks" :key="task.id">
      <h3>{{ index + 1 }}. {{ task.title.text }}</h3>
      <RichText :value="task.prompt" />
      <details v-if="parent">
        <summary>查看参考英文</summary>
        <RichText
          :value="task.answer"
          lang="en"
          class="english compact"
        /><button @click="$emit('speak', task.answer.text, task.id)">
          {{ activeId === task.id ? "停止" : "▷ 朗读参考句" }}
        </button>
      </details>
      <template v-else
        ><RichText
          :value="task.answer"
          lang="en"
          class="english compact" /><button
          @click="$emit('speak', task.answer.text, task.id)"
        >
          {{ activeId === task.id ? "停止" : "▷ 朗读指令" }}</button
        ><RichText :value="task.observation" class="muted" /></template
      >
    </article>
  </section>
</template>
