<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { loadLesson, courses } from "../composables/useCourses";
import { useProgress } from "../composables/useProgress";
import { useSpeech } from "../composables/useSpeech";
import { useToday } from "../composables/useToday";
import {
  entry,
  completeLesson,
  completeReview,
  dueOffsets,
  type Rating,
} from "../domain/progress";
import type { Lesson } from "../domain/content";
import InstructionCard from "../components/InstructionCard.vue";
import AssessmentPanel from "../components/AssessmentPanel.vue";
import RichText from "../components/RichText.vue";
const route = useRoute(),
  { state, mutate } = useProgress(),
  speech = useSpeech(),
  today = useToday();
const lesson = ref<Lesson>(),
  error = ref(""),
  busy = ref(false),
  confirmMissing = ref(false),
  notice = ref("");
let request = 0;
async function load() {
  const token = ++request;
  lesson.value = undefined;
  error.value = "";
  notice.value = "";
  confirmMissing.value = false;
  busy.value = true;
  speech.stop();
  try {
    const result = await loadLesson(String(route.params.id));
    if (token !== request) return;
    lesson.value = result;
    mutate((p) => (p.lastLesson = result.id));
  } catch (e) {
    if (token === request)
      error.value = e instanceof Error ? e.message : "无法加载课程";
  } finally {
    if (token === request) busy.value = false;
  }
}
watch(() => route.params.id, load, { immediate: true });
const progress = computed(() =>
  lesson.value ? state.value.lessons[lesson.value.id] : undefined,
);
const ratings = computed(() => progress.value?.ratings ?? {});
const due = computed(() =>
  lesson.value ? dueOffsets(state.value, lesson.value.id, today.value) : [],
);
const missing = computed(() =>
  lesson.value
    ? [
        ...lesson.value.items,
        ...lesson.value.childTasks,
        ...lesson.value.parentTasks,
      ].filter((i) => !ratings.value[i.id]).length
    : 0,
);
const next = computed(() =>
  courses.value.find((c) => c.order > (lesson.value?.order ?? Infinity)),
);
function rate(id: string, value: Rating) {
  mutate((p) => (entry(p, lesson.value!.id).ratings[id] = value));
}
function finish(force = false) {
  if (missing.value && !force) {
    confirmMissing.value = true;
    return;
  }
  mutate((p) => completeLesson(p, lesson.value!.id, lesson.value!.revision));
  confirmMissing.value = false;
  notice.value = "本课已完成。下次复习会出现在“间隔复习”中。";
}
function review() {
  mutate((p) => completeReview(p, lesson.value!.id, today.value));
  notice.value = "本次到期复习已完成，未来节点保持不变。";
}
</script>
<template>
  <div class="reading-page">
    <RouterLink to="/lessons" class="back-link">← 全部课程</RouterLink>
    <div v-if="busy" class="empty" role="status">正在打开这一课…</div>
    <div v-else-if="error" class="empty" role="alert">
      <h1>暂时无法打开</h1>
      <p>{{ error }}</p>
      <button @click="load">重试</button>
    </div>
    <template v-else-if="lesson"
      ><div class="page-heading lesson-heading">
        <span class="eyebrow"
          >DAY {{ String(lesson.order).padStart(2, "0") }} ·
          {{ lesson.kind === "assessment" ? "本周小测" : "听懂照做" }} ·
          {{ lesson.estimatedMinutes }} 分钟</span
        >
        <h1>{{ lesson.title }}</h1>
        <RichText :value="lesson.goal" /><span
          class="status-stamp"
          v-if="progress?.learnedOn"
          >已完成 · {{ progress.learnedOn }}</span
        >
      </div>
      <div
        class="notice"
        v-if="progress?.revision && progress.revision < lesson.revision"
      >
        这节课的内容已更新，你的学习记录仍然保留，可以再练一次。
      </div>
      <div class="notice" v-if="route.query.review && due.length">
        本次复习覆盖第
        {{ due.join(" / ") }} 天节点。看完本课指令后，可在页尾完成复习。
      </div>
      <details class="warmup">
        <summary>先热身 · 原稿串联练习</summary>
        <p class="muted">这些是情境提示，实际到期课程请查看“间隔复习”。</p>
        <RichText :value="lesson.warmup" />
      </details>
      <section v-if="lesson.kind === 'assessment'" class="tests">
        <AssessmentPanel
          :tasks="lesson.childTasks"
          :ratings="ratings"
          @rate="rate"
          @speak="speech.speak"
        /><AssessmentPanel
          :tasks="lesson.parentTasks"
          :ratings="ratings"
          parent
          @rate="rate"
          @speak="speech.speak"
        />
      </section>
      <div class="section-heading">
        <span class="eyebrow">{{
          lesson.kind === "assessment" ? "BEDTIME MOMENTS" : "SAY IT. DO IT."
        }}</span>
        <h2>
          {{
            lesson.kind === "assessment" ? "睡前，温柔地说" : "今天的日常指令"
          }}
        </h2>
        <p>先说一句，再配合动作。记录孩子这一次的表现。</p>
      </div>
      <div
        class="speech-status"
        role="status"
        v-if="speech.message.value || speech.playing.value"
      >
        {{ speech.message.value || "正在使用设备本地英语语音" }}
        <button v-if="speech.playing.value" @click="speech.stop">
          停止朗读
        </button>
      </div>
      <InstructionCard
        v-for="(item, index) in lesson.items"
        :key="item.id"
        :item="item"
        :index="index"
        :rating="ratings[item.id]"
        @rate="rate"
        @speak="speech.speak"
      />
      <section class="finish">
        <h2>今天的一小步，记下来。</h2>
        <p>
          已记录 {{ lesson.instructionCount + lesson.taskCount - missing }} /
          {{
            lesson.instructionCount + lesson.taskCount
          }}
          项，不需要每句都做对才算完成。
        </p>
        <div class="notice" v-if="confirmMissing">
          <p>还有 {{ missing }} 项未记录。可以继续练习，也可以先完成本课。</p>
          <button @click="confirmMissing = false">继续练习</button>
          <button class="primary" @click="finish(true)">仍然完成</button>
        </div>
        <div class="actions">
          <button class="primary" @click="finish(false)">
            {{ progress?.learnedOn ? "记录本次练习" : "完成本课" }}</button
          ><button v-if="due.length" @click="review">完成本次复习</button
          ><RouterLink v-if="next" :to="'/lessons/' + next.id" class="text-link"
            >下一课 →</RouterLink
          ><RouterLink v-else to="/review" class="text-link"
            >查看复习安排 →</RouterLink
          >
        </div>
        <p role="status" class="success" v-if="notice">{{ notice }}</p>
      </section>
      <p class="source-note">来源：{{ lesson.source }}</p></template
    >
  </div>
</template>
