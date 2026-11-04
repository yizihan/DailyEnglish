import { ref, onMounted, onUnmounted } from "vue";
export function useSpeech() {
  const voice = ref<SpeechSynthesisVoice>();
  const playing = ref(false);
  const message = ref("");
  const synth =
    typeof window !== "undefined" && "speechSynthesis" in window
      ? window.speechSynthesis
      : undefined;
  const choose = () => {
    const voices =
      synth
        ?.getVoices()
        .filter((v) => v.localService && /^en[-_]/i.test(v.lang)) ?? [];
    voice.value =
      voices.find((v) => v.lang.toLowerCase() === "en-us") ?? voices[0];
  };
  let generation = 0;
  function stop() {
    generation++;
    synth?.cancel();
    playing.value = false;
  }
  function speak(text: string) {
    stop();
    message.value = "";
    choose();
    if (!synth || !voice.value) {
      message.value = "当前设备暂无本地英语朗读，请由家长示范。";
      return;
    }
    const token = generation;
    const utterance = new SpeechSynthesisUtterance(text.replace(/‿/g, " "));
    utterance.voice = voice.value;
    utterance.lang = voice.value.lang;
    utterance.rate = 0.85;
    utterance.onend = () => {
      if (token === generation) playing.value = false;
    };
    utterance.onerror = () => {
      if (token === generation) {
        playing.value = false;
        message.value = "本地朗读未能播放，请由家长示范。";
      }
    };
    playing.value = true;
    synth.speak(utterance);
  }
  onMounted(() => {
    choose();
    synth?.addEventListener("voiceschanged", choose);
  });
  onUnmounted(() => {
    stop();
    synth?.removeEventListener("voiceschanged", choose);
  });
  return { voice, playing, message, speak, stop };
}
