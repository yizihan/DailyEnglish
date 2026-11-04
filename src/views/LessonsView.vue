<script setup lang="ts">
import { ref, computed } from "vue";
import { courses } from "../composables/useCourses";
import { useProgress } from "../composables/useProgress";
import { themes } from "../domain/content";
const { state } = useProgress();
const query = ref(""),
  theme = ref("");
const filtered = computed(() =>
  courses.value.filter(
    (c) =>
      (!theme.value || c.theme === theme.value) &&
      c.search.toLowerCase().includes(query.value.trim().toLowerCase()),
  ),
);
</script>
<template>
  <div class="page-heading">
    <span class="eyebrow">THE EVERYDAY COLLECTION</span>
    <h1>每一个日常，都是课堂。</h1>
    <p>{{ courses.length }} 节课程，随时翻开你需要的那一页。</p>
  </div>
  <div class="filters">
    <label
      >搜索课程<input
        v-model="query"
        type="search"
        placeholder="搜中文场景或英文指令" /></label
    ><label
      >生活场景<select v-model="theme">
        <option value="">全部场景</option>
        <option v-for="(label, key) in themes" :key="key" :value="key">
          {{ label }}
        </option>
      </select></label
    >
  </div>
  <div class="lesson-list">
    <RouterLink
      v-for="c in filtered"
      :key="c.id"
      :to="'/lessons/' + c.id"
      class="lesson-row"
      ><span class="row-number">{{ String(c.order).padStart(2, "0") }}</span>
      <div>
        <span class="eyebrow"
          >{{ themes[c.theme] }} ·
          {{ c.kind === "assessment" ? "周测" : "日常练习" }}</span
        >
        <h2>{{ c.title }}</h2>
        <p>
          {{ c.instructionCount }} 条指令 · 约
          {{ c.estimatedMinutes }} 分钟<span v-if="c.taskCount">
            · {{ c.taskCount }} 个测评任务</span
          >
        </p>
      </div>
      <span class="row-status">{{
        state.lessons[c.id]?.learnedOn ? "已完成 ✓" : "去练习 ↗"
      }}</span></RouterLink
    >
    <div class="empty" v-if="!filtered.length">
      <h2>暂时没有匹配的课程</h2>
      <p>换一个关键词，或看看全部场景。</p>
      <button
        @click="
          query = '';
          theme = '';
        "
      >
        清除筛选
      </button>
    </div>
  </div>
</template>
