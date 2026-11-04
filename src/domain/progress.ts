import { z } from "zod";
export const STORAGE_KEY = "dailyenglish:parent-child-english:v1";
export const OFFSETS = [1, 2, 4, 7] as const;
export const labels = {
  independent: "独立完成",
  prompted: "提示后完成",
  again: "再练一次",
} as const;
export type Rating = keyof typeof labels;
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dayNumber(date: string) {
  return Date.parse(`${date}T00:00:00Z`) / 86400000;
}
const validDate = (v: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(dayNumber(v)) &&
  new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
const dateSchema = z.string().refine(validDate, "日期无效");
const id = z.string().regex(/^day-\d{3,}$/);
const itemId = z.string().regex(/^day-\d{3,}-[icp]\d{2,}$/);
const entrySchema = z
  .object({
    learnedOn: dateSchema.optional(),
    completedAt: z.iso.datetime().optional(),
    revision: z.number().int().positive().optional(),
    ratings: z.record(itemId, z.enum(["independent", "prompted", "again"])),
    reviews: z.record(z.string().regex(/^(1|2|4|7)$/), dateSchema),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      Boolean(v.learnedOn) !== Boolean(v.completedAt) ||
      Boolean(v.learnedOn) !== Boolean(v.revision)
    )
      ctx.addIssue({ code: "custom", message: "完成状态不完整" });
    for (const [offset, date] of Object.entries(v.reviews))
      if (
        !v.learnedOn ||
        dayNumber(date) < dayNumber(v.learnedOn) + Number(offset)
      )
        ctx.addIssue({ code: "custom", message: "复习记录早于到期日" });
  });
export const progressSchema = z
  .object({
    schemaVersion: z.literal(1),
    courseId: z.literal("parent-child-english"),
    lastLesson: id.optional(),
    lessons: z.record(id, entrySchema),
  })
  .strict()
  .superRefine((v, ctx) => {
    for (const [lessonId, entry] of Object.entries(v.lessons))
      for (const key of Object.keys(entry.ratings))
        if (!key.startsWith(`${lessonId}-`))
          ctx.addIssue({ code: "custom", message: "练习记录属于其他课程" });
  });
export type Progress = z.infer<typeof progressSchema>;
export function freshProgress(): Progress {
  return { schemaVersion: 1, courseId: "parent-child-english", lessons: {} };
}
export function entry(progress: Progress, id: string) {
  return (
    progress.lessons[id] ??
    (progress.lessons[id] = { ratings: {}, reviews: {} })
  );
}
export function completeLesson(
  progress: Progress,
  id: string,
  revision: number,
  now = new Date(),
) {
  const e = entry(progress, id);
  if (!e.learnedOn) {
    e.learnedOn = localDate(now);
    e.completedAt = now.toISOString();
  }
  e.revision = revision;
}
export function dueOffsets(
  progress: Progress,
  id: string,
  today = localDate(),
): number[] {
  const e = progress.lessons[id];
  if (!e?.learnedOn) return [];
  return OFFSETS.filter(
    (n) =>
      dayNumber(today) >= dayNumber(e.learnedOn!) + n && !e.reviews[String(n)],
  );
}
export function completeReview(
  progress: Progress,
  id: string,
  today = localDate(),
) {
  const due = dueOffsets(progress, id, today);
  if (due.length)
    for (const n of due) entry(progress, id).reviews[String(n)] = today;
}
const backupSchema = z
  .object({
    format: z.literal("dailyenglish-progress"),
    exportedAt: z.iso.datetime(),
    progress: progressSchema,
  })
  .strict();
export function exportProgress(progress: Progress) {
  return JSON.stringify(
    {
      format: "dailyenglish-progress",
      exportedAt: new Date().toISOString(),
      progress: progressSchema.parse(progress),
    },
    null,
    2,
  );
}
export function importProgress(raw: string): Progress {
  if (new TextEncoder().encode(raw).length > 5 * 1024 * 1024)
    throw new Error("备份不能超过 5 MB");
  try {
    return backupSchema.parse(JSON.parse(raw)).progress;
  } catch {
    throw new Error("备份格式、版本或记录无效，现有进度未改变");
  }
}
