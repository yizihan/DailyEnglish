import { readdir, readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { parseLesson, validateCollection } from "./parser";
export async function compileContent(check = false) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const files = (await readdir(resolve(root, "content/lessons")))
    .filter((f) => f.endsWith(".md"))
    .sort();
  if (!files.length) throw new Error("没有课程");
  const lessons = await Promise.all(
    files.map(async (f) =>
      parseLesson(
        await readFile(resolve(root, "content/lessons", f), "utf8"),
        f,
      ),
    ),
  );
  validateCollection(lessons);
  lessons.sort((a, b) => a.order - b.order);
  if (!check) {
    const out = resolve(root, "public/courses");
    await mkdir(out, { recursive: true });
    const valid = new Set(lessons.map((l) => `${l.id}.json`));
    for (const f of await readdir(out))
      if (f.endsWith(".json") && f !== "index.json" && !valid.has(f))
        await rm(resolve(out, f));
    for (const lesson of lessons)
      await writeFile(
        resolve(out, `${lesson.id}.json`),
        JSON.stringify(lesson),
      );
    const index = lessons.map(
      ({ items, childTasks, parentTasks, goal, warmup, ...meta }) => meta,
    );
    await writeFile(resolve(out, "index.json"), JSON.stringify(index));
  }
  return lessons;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  compileContent(process.argv.includes("--check"))
    .then((l) =>
      console.log(
        `课程校验通过：${l.length} 课，${l.reduce((n, c) => n + c.items.length, 0)} 条指令，${l.reduce((n, c) => n + c.taskCount, 0)} 个测评任务`,
      ),
    )
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
