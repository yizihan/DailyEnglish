import { createRouter, createWebHashHistory } from "vue-router";
import { h } from "vue";
import TodayView from "./views/TodayView.vue";
import LessonsView from "./views/LessonsView.vue";
import LessonView from "./views/LessonView.vue";
import ReviewView from "./views/ReviewView.vue";
import ProgressView from "./views/ProgressView.vue";
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", component: TodayView },
    { path: "/lessons", component: LessonsView },
    { path: "/lessons/:id", component: LessonView },
    { path: "/review", component: ReviewView },
    { path: "/progress", component: ProgressView },
    {
      path: "/:pathMatch(.*)*",
      component: {
        render: () =>
          h("section", { class: "empty" }, [
            h("h1", "这一页还没有内容"),
            h("p", "回到今日，继续一小步。"),
            h("a", { href: "#/" }, "返回今日"),
          ]),
      },
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
