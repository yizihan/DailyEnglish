import { ref } from "vue";
import {
  freshProgress,
  progressSchema,
  STORAGE_KEY,
  type Progress,
} from "../domain/progress";
const state = ref<Progress>(freshProgress());
const storageError = ref("");
const blocked = ref(false);
let originalRaw: string | null = null;
try {
  originalRaw = localStorage.getItem(STORAGE_KEY);
  if (originalRaw) state.value = progressSchema.parse(JSON.parse(originalRaw));
} catch {
  blocked.value = true;
  storageError.value =
    "本地记录无法读取。原数据未覆盖，请先导出原始记录，再重置或导入备份。";
}
function save() {
  if (blocked.value) return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(progressSchema.parse(state.value)),
    );
    storageError.value = "";
  } catch {
    storageError.value = "本次进度未保存，请导出备份。当前页面仍可继续学习。";
  }
}
function mutate(fn: (p: Progress) => void) {
  fn(state.value);
  save();
}
function replace(next: Progress) {
  const safe = progressSchema.parse(next);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    state.value = safe;
    blocked.value = false;
    originalRaw = null;
    storageError.value = "";
  } catch {
    throw new Error("浏览器无法保存，现有进度未替换。请检查存储权限。");
  }
}
export function download(name: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function useProgress() {
  return {
    state,
    storageError,
    blocked,
    mutate,
    replace,
    raw: () => originalRaw,
  };
}
