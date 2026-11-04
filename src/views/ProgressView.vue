<script setup lang="ts">
import { computed, ref } from "vue";
import { courses } from "../composables/useCourses";
import { useProgress, download } from "../composables/useProgress";
import {
  exportProgress,
  importProgress,
  freshProgress,
  localDate,
  labels,
  type Progress,
} from "../domain/progress";
const { state, replace, raw, blocked } = useProgress();
const pending = ref<Progress>(),
  error = ref(""),
  notice = ref(""),
  confirmReset = ref(false);
const done = computed(() =>
  courses.value.filter((c) => state.value.lessons[c.id]?.learnedOn),
);
const totalRatings = computed(() =>
  Object.values(state.value.lessons).reduce(
    (n, e) => n + Object.keys(e.ratings).length,
    0,
  ),
);
function backup() {
  download(
    `dailyenglish-progress-${localDate()}.json`,
    exportProgress(state.value),
  );
}
async function selectFile(event: Event) {
  pending.value = undefined;
  error.value = "";
  notice.value = "";
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error("备份不能超过 5 MB");
    pending.value = importProgress(await file.text());
  } catch (e) {
    error.value = e instanceof Error ? e.message : "无法读取文件";
  } finally {
    input.value = "";
  }
}
function apply() {
  try {
    replace(pending.value!);
    pending.value = undefined;
    notice.value = "备份已恢复。";
  } catch (e) {
    error.value = (e as Error).message;
  }
}
function reset() {
  try {
    replace(freshProgress());
    confirmReset.value = false;
    notice.value = "本地记录已清空。";
  } catch (e) {
    error.value = (e as Error).message;
  }
}
</script>
<template>
  <div class="page-heading">
    <span class="eyebrow">YOUR FAMILY NOTEBOOK</span>
    <h1>一点一滴，都在这里。</h1>
    <p>记录属于你，不上传到服务器。换设备前，记得带上一份备份。</p>
  </div>
  <div class="stats">
    <div>
      <strong
        >{{ done.length }}<small> / {{ courses.length }}</small></strong
      ><span>已完成课程</span>
    </div>
    <div>
      <strong>{{ totalRatings }}</strong
      ><span>已记录练习</span>
    </div>
  </div>
  <section class="backup-section">
    <h2>备份与恢复</h2>
    <p>
      导出 JSON 文件，在另一台设备导入即可接续。清除浏览器数据会清除本地记录。
    </p>
    <div class="actions">
      <button class="primary" @click="backup">导出学习进度</button
      ><label class="button file-button"
        >导入备份<input
          aria-label="导入备份文件"
          type="file"
          accept="application/json,.json"
          @change="selectFile" /></label
      ><button
        v-if="blocked && raw()"
        @click="download('dailyenglish-original.json', raw()!)"
      >
        导出原始记录
      </button>
    </div>
    <div class="notice" v-if="pending">
      <h3>确认替换当前进度？</h3>
      <p>
        备份包含
        {{ Object.keys(pending.lessons).length }}
        节课程记录。导入将整份替换，不会合并；请先导出当前进度。
      </p>
      <div class="actions">
        <button @click="backup">先导出当前进度</button
        ><button class="primary" @click="apply">确认替换</button
        ><button @click="pending = undefined">取消导入</button>
      </div>
    </div>
    <p class="error" role="alert" v-if="error">{{ error }}</p>
    <p class="success" role="status" v-if="notice">{{ notice }}</p>
  </section>
  <section>
    <div class="section-heading"><h2>学习记录</h2></div>
    <div class="empty" v-if="!done.length">
      <p>还没有完成记录。从第一句开始吧。</p>
      <RouterLink to="/" class="text-link">去今日学习 →</RouterLink>
    </div>
    <details v-for="c in done" :key="c.id" class="history">
      <summary>
        Day {{ c.order }} · {{ c.title }}
        <span>{{ state.lessons[c.id]?.learnedOn }}</span>
      </summary>
      <p>
        已记录
        {{ Object.keys(state.lessons[c.id]?.ratings ?? {}).length }} 项，已完成
        {{ Object.keys(state.lessons[c.id]?.reviews ?? {}).length }}
        个复习节点。
      </p>
      <ul>
        <li v-for="(label, rating) in labels" :key="rating">
          {{ label }}：{{
            Object.values(state.lessons[c.id]?.ratings ?? {}).filter(
              (value) => value === rating,
            ).length
          }}
          项
        </li>
      </ul>
      <RouterLink :to="'/lessons/' + c.id" class="text-link"
        >回到课程 →</RouterLink
      >
    </details>
  </section>
  <section class="reset-section">
    <h2>重新开始</h2>
    <p>只清空本浏览器的学习记录，不影响课程内容。</p>
    <button @click="confirmReset = true">清空本地记录</button>
    <div class="notice" v-if="confirmReset">
      <p>清空后只能通过备份恢复。是否已经保存需要的记录？</p>
      <div class="actions">
        <button @click="backup">导出备份</button
        ><button class="danger" @click="reset">确认清空</button
        ><button @click="confirmReset = false">取消</button>
      </div>
    </div>
  </section>
</template>
