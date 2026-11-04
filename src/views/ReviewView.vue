<script setup lang="ts">
import { computed } from "vue";
import { courses } from "../composables/useCourses";
import { useProgress } from "../composables/useProgress";
import { useToday } from "../composables/useToday";
import { dueOffsets, dayNumber, OFFSETS } from "../domain/progress";
const { state } = useProgress();
const today = useToday();
const due = computed(() =>
  courses.value
    .map((c) => ({
      course: c,
      offsets: dueOffsets(state.value, c.id, today.value),
      start: state.value.lessons[c.id]?.learnedOn,
    }))
    .filter((x) => x.offsets.length)
    .sort(
      (a, b) =>
        dayNumber(a.start!) +
          a.offsets[0] -
          (dayNumber(b.start!) + b.offsets[0]) ||
        a.course.order - b.course.order,
    ),
);
const upcoming = computed(() =>
  courses.value
    .flatMap((c) => {
      const e = state.value.lessons[c.id];
      if (!e?.learnedOn) return [];
      return OFFSETS.filter(
        (n) =>
          !e.reviews[String(n)] &&
          dayNumber(e.learnedOn!) + n > dayNumber(today.value),
      ).map((n) => ({
        id: `${c.id}-${n}`,
        course: c,
        offset: n,
        date: new Date((dayNumber(e.learnedOn!) + n) * 86400000)
          .toISOString()
          .slice(0, 10),
      }));
    })
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.course.order - b.course.order,
    ),
);
</script>
<template>
  <div class="page-heading">
    <span class="eyebrow">SMALL REPEATS, LASTING MEMORIES</span>
    <h1>熟悉的话，再说一次。</h1>
    <p>
      按首次完成后的第 1、2、4、7 天复习。漏过几天也没关系，同一课只出现一次。
    </p>
  </div>
  <section>
    <div class="section-heading">
      <h2>
        到期复习 <span class="badge">{{ due.length }}</span>
      </h2>
    </div>
    <RouterLink
      class="lesson-row"
      v-for="d in due"
      :key="d.course.id"
      :to="{ path: '/lessons/' + d.course.id, query: { review: '1' } }"
      ><span class="row-number">{{
        String(d.course.order).padStart(2, "0")
      }}</span>
      <div>
        <h2>{{ d.course.title }}</h2>
        <p>
          覆盖第 {{ d.offsets.join(" / ") }} 天节点 · 首次完成 {{ d.start }}
        </p>
      </div>
      <span class="row-status">去复习 ↗</span></RouterLink
    >
    <div class="empty" v-if="!due.length">
      <span class="empty-symbol">✓</span>
      <h2>今天没有到期任务</h2>
      <p>可以学一节新课，也可以在生活里随手用一句。</p>
      <RouterLink to="/lessons" class="text-link">翻开课程 →</RouterLink>
    </div>
  </section>
  <section class="upcoming">
    <div class="section-heading">
      <h2>接下来的复习</h2>
      <p>日期会随首次完成时间安排，提前浏览课程不会重置计划。</p>
    </div>
    <ol v-if="upcoming.length" class="schedule">
      <li v-for="u in upcoming" :key="u.id">
        <time>{{ u.date }}</time
        ><RouterLink :to="'/lessons/' + u.course.id"
          >Day {{ u.course.order }} · {{ u.course.title }}</RouterLink
        ><span>第 {{ u.offset }} 天</span>
      </li>
    </ol>
    <p v-else class="muted">暂无后续节点。完成一课后，这里就会出现安排。</p>
  </section>
</template>
