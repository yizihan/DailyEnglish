import type { Lesson } from "./content";

export interface ListeningLine {
  zh?: string;
  en: string;
}

export function lessonListening(lesson: Lesson): ListeningLine[] {
  const tasks = lesson.childTasks.map((task) => ({
    zh: task.zh?.text,
    en: task.answer.text,
  }));
  const instructions = lesson.items.map((item) => ({
    zh: item.zh.text,
    en: item.en.text,
  }));
  return [...tasks, ...instructions];
}
