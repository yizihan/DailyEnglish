import { ref, onMounted, onUnmounted } from "vue";
import type { ListeningLine } from "../domain/listening";

const repeatGapMs = 2000;
const actionGapMs = 3000;
const noEnglishVoice = "当前设备暂无本地英语朗读，请由家长示范。";
const playbackError = "本地朗读未能播放，请由家长示范。";

export function useSpeech() {
  const activeId = ref<string>();
  const message = ref("");
  const lessonMode = ref<"idle" | "parent-meaning" | "playing">("idle");
  const lessonMessage = ref("");
  const synth =
    typeof window !== "undefined" && typeof window.SpeechSynthesisUtterance === "function"
      ? window.speechSynthesis
      : undefined;
  let englishVoice: SpeechSynthesisVoice | undefined;
  let chineseVoice: SpeechSynthesisVoice | undefined;
  function choose() {
    const voices = synth?.getVoices().filter((v) => v.localService) ?? [];
    englishVoice = voices.find((v) => /^en[-_]US$/i.test(v.lang))
      ?? voices.find((v) => /^en(?:[-_]|$)/i.test(v.lang));
    chineseVoice = voices.find((v) => /^zh[-_]CN$/i.test(v.lang))
      ?? voices.find((v) => /^zh(?:[-_]|$)/i.test(v.lang));
  }

  let generation = 0;
  let timer: number | undefined;
  let afterParentReads: (() => void) | undefined;
  function stop() {
    generation++;
    window.clearTimeout(timer);
    timer = undefined;
    afterParentReads = undefined;
    synth?.cancel();
    activeId.value = undefined;
    message.value = "";
    lessonMode.value = "idle";
    lessonMessage.value = "";
  }

  function read(
    text: string,
    voice: SpeechSynthesisVoice,
    onEnd: () => void,
    onError: () => void,
  ) {
    if (!synth) {
      onError();
      return;
    }
    const token = generation;
    try {
      const utterance = new SpeechSynthesisUtterance(text.replace(/‿/g, " "));
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 0.85;
      utterance.onend = () => { if (token === generation) onEnd(); };
      utterance.onerror = () => { if (token === generation) onError(); };
      synth.speak(utterance);
    } catch {
      if (token === generation) onError();
    }
  }

  function speak(text: string, id: string) {
    const sameItem = activeId.value === id;
    stop();
    if (sameItem) return;
    choose();
    if (!englishVoice) {
      message.value = noEnglishVoice;
      return;
    }
    activeId.value = id;
    read(text, englishVoice, () => { activeId.value = undefined; }, () => {
      stop();
      message.value = playbackError;
    });
  }

  function continueInEnglish() {
    const next = afterParentReads;
    afterParentReads = undefined;
    next?.();
  }

  function toggleLesson(lines: ListeningLine[]) {
    const wasActive = lessonMode.value !== "idle";
    stop();
    if (wasActive || !lines.length) return;
    choose();
    const voice = englishVoice;
    if (!voice) {
      lessonMessage.value = noEnglishVoice;
      return;
    }
    const playLine = (index: number) => {
      const { zh, en } = lines[index];
      const position = `第 ${index + 1} / ${lines.length} 条`;
      lessonMode.value = "playing";

      const onEnglishError = () => {
        stop();
        lessonMessage.value = playbackError;
      };
      const finishLine = () => {
        if (index + 1 < lines.length) {
          timer = window.setTimeout(() => playLine(index + 1), actionGapMs);
        } else {
          lessonMode.value = "idle";
          lessonMessage.value = "本课重点已播完。";
        }
      };
      const startEnglish = () => {
        lessonMode.value = "playing";
        lessonMessage.value = position;
        read(en, voice, () => {
          timer = window.setTimeout(() => read(en, voice, finishLine, onEnglishError), repeatGapMs);
        }, onEnglishError);
      };
      const askParent = () => {
        lessonMode.value = "parent-meaning";
        lessonMessage.value = zh
          ? `${position} · 请家长读：${zh}`
          : `${position} · 请家长用中文解释「${en.replace(/‿/g, " ")}」。`;
        afterParentReads = startEnglish;
      };
      if (zh && chineseVoice) {
        lessonMessage.value = `${position} · ${zh}`;
        read(zh, chineseVoice, startEnglish, askParent);
      } else {
        askParent();
      }
    };
    playLine(0);
  }

  onMounted(() => {
    choose();
    synth?.addEventListener("voiceschanged", choose);
    window.addEventListener("pagehide", stop);
  });
  onUnmounted(() => {
    stop();
    synth?.removeEventListener("voiceschanged", choose);
    window.removeEventListener("pagehide", stop);
  });
  return { activeId, message, lessonMode, lessonMessage, speak, toggleLesson, continueInEnglish, stop };
}
