import { onMounted, onUnmounted, ref } from "vue";
import { localDate } from "../domain/progress";
export function useToday() {
  const today = ref(localDate());
  let timer: ReturnType<typeof setInterval>;
  const update = () => (today.value = localDate());
  onMounted(() => {
    timer = setInterval(update, 60000);
    window.addEventListener("focus", update);
  });
  onUnmounted(() => {
    clearInterval(timer);
    window.removeEventListener("focus", update);
  });
  return today;
}
