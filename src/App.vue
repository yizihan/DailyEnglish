<script setup lang="ts">
import { onMounted } from "vue";
import {
  courses,
  courseError,
  loadCourses,
  loading,
} from "./composables/useCourses";
import { useProgress } from "./composables/useProgress";
const { storageError } = useProgress();
onMounted(loadCourses);
const nav = [
  ["/", "今日学习", "01"],
  ["/lessons", "全部课程", "02"],
  ["/review", "间隔复习", "03"],
  ["/progress", "我的手账", "04"],
];
function skip() {
  document.getElementById("main")?.focus();
}
</script>
<template>
  <a class="skip" href="#main" @click.prevent="skip">跳到主要内容</a>
  <div class="app-shell">
    <aside class="sidebar">
      <RouterLink to="/" class="brand"
        ><span class="brand-mark">de.</span
        ><span>Daily English<small>亲子英语手账</small></span></RouterLink
      >
      <nav aria-label="主导航">
        <RouterLink
          v-for="[to, label, n] in nav"
          :key="to"
          :to="to"
          :class="{
            active:
              to === '/' ? $route.path === '/' : $route.path.startsWith(to),
          }"
          ><span>{{ n }}</span
          >{{ label }}</RouterLink
        >
      </nav>
      <div class="sidebar-note">
        <span class="tiny-rule"></span>
        <p>一句英语<br />一个动作<br />一点点长大</p>
        <small>每天 10–15 分钟</small>
      </div>
    </aside>
    <div class="workspace">
      <header class="topline">
        <span>家庭里的英语小时光</span><span>听懂 · 照做 · 不必急着说</span>
      </header>
      <main id="main" tabindex="-1">
        <div v-if="storageError" class="notice" role="alert">
          {{ storageError }} <RouterLink to="/progress">管理备份</RouterLink>
        </div>
        <div v-if="loading" class="empty" role="status">正在翻开课程…</div>
        <div v-else-if="courseError" class="empty" role="alert">
          <h1>暂时没能打开课程</h1>
          <p>{{ courseError }}</p>
          <button @click="loadCourses">重新加载</button>
        </div>
        <RouterView v-else-if="courses.length" />
      </main>
      <footer>
        内容由大模型辅助生成并整理，发音提示仍需校对。<br />学习记录只保存在本浏览器，可在“我的手账”导出备份。
      </footer>
    </div>
  </div>
</template>
