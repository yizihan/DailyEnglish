import { readFile } from "node:fs/promises";
import { describe, it, expect } from "vitest";
import { compileContent } from "../scripts/content";
import { parseLesson, validateCollection } from "../scripts/parser";
const source = await readFile(
  new URL("../content/lessons/day_001.md", import.meta.url),
  "utf8",
);
describe("course publishing", () => {
  it("preserves 7 lessons, 26 instructions, and 4+4 assessment tasks", async () => {
    const lessons = await compileContent(true);
    expect(lessons.length).toBeGreaterThanOrEqual(7);
    expect(lessons.slice(0, 7).map((l) => l.items.length)).toEqual([4, 4, 4, 4, 4, 4, 2]);
    expect(lessons[6].childTasks).toHaveLength(4);
    expect(lessons[6].parentTasks).toHaveLength(4);
    expect(lessons[0].items[0].en.html).toContain("<strong>Time</strong>");
    expect(lessons[0].items[0].en.text).toBe("Time to get‿up!");
    expect(lessons[0].items[1].pronunciation.text).toContain("/ʃɜːrt/");
    expect(lessons[5].warmup.text).toContain("Grab your bag");
    expect(lessons[6].parentTasks[2].prompt.text).toContain("固体食物");
  });
  it("accepts a new lesson without app changes", () => {
    const next = source
      .replaceAll("day-001", "day-008")
      .replace("order: 1", "order: 8");
    const lesson = parseLesson(next, "day_008.md");
    expect(lesson.order).toBe(8);
    validateCollection([parseLesson(source, "day_001.md"), lesson]);
  });
  it("requires the filename to match the lesson ID in underscore format", () => {
    expect(parseLesson(source, "day_001.md").id).toBe("day-001");
    expect(() => parseLesson(source, "day-001.md")).toThrow();
    expect(() => parseLesson(source, "day_002.md")).toThrow();
  });
  it.each(["draft", "curated", "reviewed", "other"])('accepts reviewStatus %s without affecting the lesson', (status) => {
    const input = source.replace(/reviewStatus:.*\r?\n/, `reviewStatus: ${status}\n`);
    const lesson = parseLesson(input, "day_001.md");
    expect(lesson.id).toBe("day-001");
    expect(lesson).not.toHaveProperty("reviewStatus");
  });
  it("accepts a lesson without reviewStatus or source", () => {
    const input = source.replace(/reviewStatus:.*\r?\n/, "").replace(/source:.*\r?\n/, "");
    const lesson = parseLesson(input, "day_001.md");
    expect(lesson.id).toBe("day-001");
    expect(lesson.source).toBe("课程内容");
  });
  it("accepts a lesson without reviewStatus", () => {
    expect(parseLesson(source.replace(/reviewStatus:.*\r?\n/, ""), "day_001.md").id).toBe("day-001");
  });
  it.each([
    ["raw HTML", source + "\n<script>alert(1)</script>"],
    ["remote image", source + "\n![remote](https://example.com/a.png)"],
    ["duplicate ID", source.replace("day-001-i02", "day-001-i01")],
    ["missing field", source.replace("#### 中文", "#### 错误字段")],
    ["bad metadata", source.replace("kind: daily", "kind: strange")],
  ])("rejects %s", (_name, text) => {
    expect(() => parseLesson(text, "day_001.md")).toThrow();
  });
  it("rejects duplicate courses and broken review links", () => {
    const lesson = parseLesson(source, "day_001.md");
    expect(() => validateCollection([lesson, lesson])).toThrow();
    lesson.warmup.text = "复习 day-999";
    expect(() => validateCollection([lesson])).toThrow();
  });
});
