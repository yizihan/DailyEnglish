import { ref } from "vue";
import type { Lesson, LessonMeta } from "../domain/content";
export const courses = ref<LessonMeta[]>([]);
export const courseError = ref("");
export const loading = ref(false);
const cache = new Map<string, Lesson>();
async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}courses/${path}`);
  if (!response.ok) throw new Error("课程暂时无法加载，请检查网络后重试");
  return response.json();
}
export async function loadCourses() {
  loading.value = true;
  courseError.value = "";
  try {
    courses.value = await get<LessonMeta[]>("index.json");
  } catch {
    courseError.value = "课程暂时无法加载，请检查网络后重试";
  } finally {
    loading.value = false;
  }
}
export async function loadLesson(id: string) {
  if (!courses.value.some((c) => c.id === id))
    throw new Error("没有找到这节课程");
  if (!cache.has(id)) cache.set(id, await get<Lesson>(`${id}.json`));
  return cache.get(id)!;
}
