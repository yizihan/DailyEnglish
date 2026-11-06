export interface Rich {
  html: string;
  text: string;
}
export interface Item {
  id: string;
  title: Rich;
  en: Rich;
  zh: Rich;
  pronunciation: Rich;
  action: Rich;
  alternatives: Rich;
}
export interface Task {
  id: string;
  title: Rich;
  prompt: Rich;
  answer: Rich;
  zh?: Rich;
  observation: Rich;
}
export interface LessonMeta {
  id: string;
  order: number;
  title: string;
  kind: "daily" | "assessment";
  theme: string;
  estimatedMinutes: number;
  revision: number;
  source: string;
  search: string;
  instructionCount: number;
  taskCount: number;
}
export interface Lesson extends LessonMeta {
  goal: Rich;
  warmup: Rich;
  items: Item[];
  childTasks: Task[];
  parentTasks: Task[];
}
export const themes: Record<string, string> = {
  morning: "晨间洗漱",
  breakfast: "早餐出门",
  homecoming: "放学回家",
  mealtime: "餐桌时光",
  chores: "收纳家务",
  outdoors: "户外出行",
  bedtime: "睡前与周测",
};
