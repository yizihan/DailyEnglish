import { describe, it, expect } from "vitest";
import {
  freshProgress,
  completeLesson,
  completeReview,
  dueOffsets,
  exportProgress,
  importProgress,
  entry,
  progressSchema,
} from "../src/domain/progress";
describe("learning and calendar reviews", () => {
  it("keeps the initial learning date, merges overdue nodes, and remains idempotent", () => {
    const p = freshProgress();
    completeLesson(p, "day-001", 1, new Date(2026, 10, 4, 12));
    expect(dueOffsets(p, "day-001", "2026-11-04")).toEqual([]);
    expect(dueOffsets(p, "day-001", "2026-11-05")).toEqual([1]);
    expect(dueOffsets(p, "day-001", "2026-11-08")).toEqual([1, 2, 4]);
    completeReview(p, "day-001", "2026-11-08");
    completeReview(p, "day-001", "2026-11-08");
    expect(Object.keys(p.lessons["day-001"].reviews)).toEqual(["1", "2", "4"]);
    completeLesson(p, "day-001", 2, new Date(2026, 10, 9, 12));
    expect(p.lessons["day-001"].learnedOn).toBe("2026-11-04");
    expect(dueOffsets(p, "day-001", "2026-11-11")).toEqual([7]);
    completeReview(p, "day-001", "2026-11-11");
    expect(dueOffsets(p, "day-001", "2027-01-01")).toEqual([]);
  });
  it.each([
    ["2026-12-31", "2027-01-01"],
    ["2028-02-28", "2028-02-29"],
    ["2026-03-08", "2026-03-09"],
  ])("handles calendar boundary %s", (start, next) => {
    const p = freshProgress();
    p.lessons["day-001"] = {
      learnedOn: start,
      completedAt: `${start}T12:00:00.000Z`,
      revision: 1,
      ratings: {},
      reviews: {},
    };
    expect(dueOffsets(p, "day-001", next)).toEqual([1]);
  });
  it("does not schedule unlearned courses", () => {
    const p = freshProgress();
    entry(p, "day-001").ratings["day-001-i01"] = "again";
    expect(dueOffsets(p, "day-001", "2026-11-11")).toEqual([]);
    completeReview(p, "day-001");
    expect(p.lessons["day-001"].reviews).toEqual({});
  });
});
describe("backup contract", () => {
  it("round-trips ratings, reviews and unknown future course IDs", () => {
    const p = freshProgress();
    completeLesson(p, "day-100", 1, new Date(2026, 10, 4));
    entry(p, "day-100").ratings["day-100-p01"] = "prompted";
    completeReview(p, "day-100", "2026-11-05");
    expect(importProgress(exportProgress(p))).toEqual(p);
  });
  it.each(["{}", "not-json", '{"format":"other"}'])(
    "rejects invalid backups without mutating data: %s",
    (raw) => {
      const p = freshProgress();
      const before = structuredClone(p);
      expect(() => importProgress(raw)).toThrow();
      expect(p).toEqual(before);
    },
  );
  it("rejects future versions, invalid dates, states and oversized files", () => {
    const p = freshProgress();
    completeLesson(p, "day-001", 1, new Date(2026, 10, 4));
    const backup = JSON.parse(exportProgress(p));
    backup.progress.schemaVersion = 2;
    expect(() => importProgress(JSON.stringify(backup))).toThrow();
    backup.progress.schemaVersion = 1;
    backup.progress.lessons["day-001"].learnedOn = "2026-02-31";
    expect(() => importProgress(JSON.stringify(backup))).toThrow();
    expect(() => importProgress("x".repeat(5 * 1024 * 1024 + 1))).toThrow(
      "5 MB",
    );
    expect(() =>
      progressSchema.parse({
        ...p,
        lessons: {
          "day-001": { ratings: { "day-001-i01": "perfect" }, reviews: {} },
        },
      }),
    ).toThrow();
  });
  it("rejects mismatched item ownership, partial completion and impossible reviews", () => {
    const p = freshProgress();
    entry(p, "day-001").ratings["day-002-i01"] = "again";
    expect(() => progressSchema.parse(p)).toThrow();
    p.lessons["day-001"] = { ratings: {}, reviews: { "7": "2026-11-04" } };
    expect(() => progressSchema.parse(p)).toThrow();
    p.lessons["day-001"].learnedOn = "2026-11-04";
    expect(() => progressSchema.parse(p)).toThrow();
  });
});
