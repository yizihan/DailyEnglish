<script setup lang="ts">
import { computed } from "vue";
import { courses } from "../composables/useCourses";
import { useProgress } from "../composables/useProgress";
import { useToday } from "../composables/useToday";
import { dueOffsets } from "../domain/progress";
import { themes } from "../domain/content";
const { state } = useProgress();
const today = useToday();
const completed = computed(
  () =>
    courses.value.filter((c) => state.value.lessons[c.id]?.learnedOn).length,
);
const next = computed(
  () =>
    courses.value.find(
      (c) =>
        c.id === state.value.lastLesson &&
        !state.value.lessons[c.id]?.learnedOn,
    ) ?? courses.value.find((c) => !state.value.lessons[c.id]?.learnedOn),
);
const due = computed(() =>
  courses.value.filter(
    (c) => dueOffsets(state.value, c.id, today.value).length,
  ),
);
</script>
<template>
  <div class="page-heading">
    <span class="eyebrow">A LITTLE ENGLISH, EVERY DAY</span>
    <h1>把英语，放进生活里。</h1>
    <p>不用准备一堂课，从今天的一句日常对话开始。</p>
    <RouterLink v-if="due.length" to="/review" class="text-link"
      >今天有 {{ due.length }} 节到期复习，先温习一下 →</RouterLink
    >
  </div>
  <div class="today-grid">
    <section class="today-sheet" v-if="next">
      <div class="sheet-meta">
        <span class="eyebrow">{{
          state.lastLesson === next.id ? "继续上次的练习" : "今天，从这里开始"
        }}</span
        ><span>{{ next.estimatedMinutes }} 分钟</span>
      </div>
      <div class="day-display">
        <span>DAY</span
        ><strong>{{ String(next.order).padStart(2, "0") }}</strong
        ><span class="theme-label">{{ themes[next.theme] }}</span>
      </div>
      <h2>{{ next.title }}</h2>
      <p>
        {{ next.instructionCount }} 条日常指令<span v-if="next.taskCount">
          · {{ next.taskCount }} 个测评任务</span
        >
      </p>
      <RouterLink :to="'/lessons/' + next.id" class="button primary"
        >{{ state.lastLesson === next.id ? "继续学习" : "开始今天的练习" }}
        <span aria-hidden="true">↗</span></RouterLink
      >
      <div class="sheet-bottom">你说英语，孩子做动作。听懂就是进步。</div>
    </section>
    <section v-else class="today-sheet">
      <span class="eyebrow">WELL DONE</span>
      <h2>这一批课程，已经走完。</h2>
      <p>让熟悉的句子继续出现在生活里，也可以回到任意课程再练一次。</p>
      <RouterLink to="/lessons" class="button primary"
        >再看看全部课程 ↗</RouterLink
      >
    </section>
    <aside class="today-aside">
      <section>
        <span class="eyebrow">REVISIT</span>
        <h2>把学过的，再用一次</h2>
        <p class="count">
          <strong>{{ due.length }}</strong> 节课程待复习
        </p>
        <p>
          {{
            due.length
              ? "按自己的节奏来，今天练一点也很好。"
              : "今天没有到期复习。完成课程后，会按 1、2、4、7 天提醒。"
          }}
        </p>
        <RouterLink to="/review" class="text-link"
          >{{ due.length ? "开始复习" : "查看复习安排" }} →</RouterLink
        >
      </section>
      <section>
        <span class="eyebrow">YOUR LITTLE STEPS</span>
        <div class="progress-title">
          <h2>这一周的小脚印</h2>
          <span>{{ completed }} / {{ courses.length }}</span>
        </div>
        <div class="week-track">
          <RouterLink
            v-for="c in courses"
            :key="c.id"
            :to="'/lessons/' + c.id"
            :class="{ done: state.lessons[c.id]?.learnedOn }"
            :aria-label="
              'Day ' +
              c.order +
              ' ' +
              (state.lessons[c.id]?.learnedOn ? '已完成' : '未完成')
            "
            >{{ state.lessons[c.id]?.learnedOn ? "✓" : c.order }}</RouterLink
          >
        </div>
        <p>不追赶进度，每一次开口都算数。</p>
      </section>
    </aside>
  </div>
  <section class="method">
    <span class="eyebrow">我们的练习方式</span>
    <div>
      <h3>01 / 家长先看一遍</h3>
      <p>读英文，看看动作提示。</p>
    </div>
    <div>
      <h3>02 / 在生活里试一试</h3>
      <p>配合手势，给孩子一点时间。</p>
    </div>
    <div>
      <h3>03 / 记下今天的小进步</h3>
      <p>听懂照做即可，不要求英文回复。</p>
    </div>
  </section>
</template>
