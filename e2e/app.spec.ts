import { test, expect } from "@playwright/test";
const key = "dailyenglish:parent-child-english:v1";
test("learn, persist, assess and safely export/import", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "开始今天的练习" }).click();
  await expect(page.locator(".instruction")).toHaveCount(4);
  await page
    .getByRole("button", { name: "独立完成", exact: true })
    .first()
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "独立完成", exact: true }).first(),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "完成本课", exact: true }).click();
  await page.getByRole("button", { name: "仍然完成" }).click();
  await expect(page.locator(".status-stamp")).toContainText("已完成");
  await page.goto("./#/lessons/day-007");
  await expect(page.locator(".assessment")).toHaveCount(2);
  await expect(page.locator(".task")).toHaveCount(8);
  await expect(page.locator(".instruction")).toHaveCount(2);
  const parent = page.locator(".assessment").nth(1);
  await expect(parent.locator(".english").first()).not.toBeVisible();
  await parent.getByText("查看参考英文", { exact: true }).first().click();
  await expect(parent.locator(".english").first()).toBeVisible();
  await parent
    .getByRole("button", { name: "说出来了", exact: true })
    .first()
    .click();
  await page.goto("./#/progress");
  const saved = await page.evaluate((k) => localStorage.getItem(k), key);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出学习进度", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/dailyenglish-progress/);
  const input = page.getByLabel("导入备份文件");
  await input.setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await expect(page.getByRole("alert")).toContainText("现有进度未改变");
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(saved);
  const backup = {
    format: "dailyenglish-progress",
    exportedAt: new Date().toISOString(),
    progress: JSON.parse(saved!),
  };
  await input.setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole("button", { name: "取消导入" }).click();
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(saved);
  await input.setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole("button", { name: "确认替换", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("备份已恢复");
});
test("overdue review merges and can be completed", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-08T12:00:00Z") });
  await page.addInitScript(
    ({ key }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          schemaVersion: 1,
          courseId: "parent-child-english",
          lessons: {
            "day-001": {
              learnedOn: "2026-11-04",
              completedAt: "2026-11-04T12:00:00Z",
              revision: 1,
              ratings: {},
              reviews: {},
            },
          },
        }),
      );
    },
    { key },
  );
  await page.goto("./#/review");
  await expect(page.locator(".lesson-row")).toHaveCount(1);
  await expect(page.locator(".lesson-row")).toContainText("1 / 2 / 4");
  await page.locator(".lesson-row").click();
  await page.getByRole("button", { name: "完成本次复习" }).click();
  await expect(page.getByRole("button", { name: "完成本次复习" })).toHaveCount(
    0,
  );
  await page.getByRole("link", { name: "03 间隔复习" }).click();
  await expect(page.locator(".lesson-row")).toHaveCount(0);
  await expect(page.locator(".schedule")).toContainText("2026-11-11");
});
test("corrupt storage is not overwritten by learning", async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, "{broken"), key);
  await page.goto("./#/lessons/day-001");
  await expect(page.getByRole("alert")).toContainText("原数据未覆盖");
  await page
    .getByRole("button", { name: "独立完成", exact: true })
    .first()
    .click();
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(
    "{broken",
  );
});
test("storage write failures keep in-memory progress and do not falsely import", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
  });
  await page.goto("./#/lessons/day-001");
  await page
    .getByRole("button", { name: "独立完成", exact: true })
    .first()
    .click();
  await expect(page.getByRole("alert")).toContainText("本次进度未保存");
  await expect(
    page.getByRole("button", { name: "独立完成", exact: true }).first(),
  ).toHaveAttribute("aria-pressed", "true");
});
test("search, empty results, missing route and load retry", async ({
  page,
}) => {
  await page.goto("./#/lessons");
  await page.getByRole("searchbox").fill("soap");
  await expect(page.locator(".lesson-row")).toHaveCount(1);
  await page.getByRole("searchbox").fill("not-found");
  await expect(page.getByText("暂时没有匹配的课程")).toBeVisible();
  await page.getByRole("button", { name: "清除筛选" }).click();
  await expect(page.locator(".lesson-row")).toHaveCount(7);
  await page.goto("./#/missing");
  await expect(
    page.getByRole("heading", { name: "这一页还没有内容" }),
  ).toBeVisible();
  await page.route("**/courses/day-002.json", (route) => route.abort());
  await page.goto("./#/lessons/day-002");
  await expect(
    page.getByRole("button", { name: "重试", exact: true }),
  ).toBeVisible();
  await page.unroute("**/courses/day-002.json");
  await page.getByRole("button", { name: "重试", exact: true }).click();
  await expect(page.locator(".instruction")).toHaveCount(4);
});
for (const width of [320, 375, 768, 1280])
  test(`responsive pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const route of [
      "",
      "lessons",
      "lessons/day-001",
      "lessons/day-007",
      "review",
      "progress",
    ]) {
      await page.goto("./#/" + route);
      await expect(page.locator("main h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.goto("./");
    await expect(page.locator(".today-sheet")).toBeVisible();
    await page.screenshot({
      path: `test-results/home-${width}.png`,
      fullPage: true,
    });
    await page.goto("./#/lessons/day-001");
    await expect(page.locator(".instruction")).toHaveCount(4);
    await page.screenshot({
      path: `test-results/lesson-${width}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
test("speech does not choose remote voices", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [{ lang: "en-US", localService: false }],
        cancel: () => {},
        speak: () => {
          throw new Error("remote voice used");
        },
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    });
  });
  await page.goto("./#/lessons/day-001");
  await page
    .getByRole("button", { name: /朗读：/ })
    .first()
    .click();
  await expect(page.getByRole("status")).toContainText("暂无本地英语朗读");
});

test("backup restores in an independent browser context and all-complete has no phantom course", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    const lessons = Object.fromEntries(
      Array.from({ length: 7 }, (_, i) => [
        `day-${String(i + 1).padStart(3, "0")}`,
        {
          learnedOn: "2026-11-04",
          completedAt: "2026-11-04T12:00:00Z",
          revision: 1,
          ratings: {},
          reviews: {},
        },
      ]),
    );
    const backup = {
      format: "dailyenglish-progress",
      exportedAt: new Date().toISOString(),
      progress: { schemaVersion: 1, courseId: "parent-child-english", lessons },
    };
    await page.goto("http://127.0.0.1:4173/DailyEnglish/#/progress");
    await page
      .getByLabel("导入备份文件")
      .setInputFiles({
        name: "backup.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(backup)),
      });
    await page.getByRole("button", { name: "确认替换", exact: true }).click();
    await page.reload();
    await expect(page.locator(".history")).toHaveCount(7);
    await page.goto("http://127.0.0.1:4173/DailyEnglish/#/");
    await expect(
      page.getByRole("heading", { name: "这一批课程，已经走完。" }),
    ).toBeVisible();
    await expect(page.locator('a[href*="day-008"]')).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("local speech removes display markers and stops on navigation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const calls = { texts: [] as string[], cancels: 0 };
    (window as unknown as { speechCalls: typeof calls }).speechCalls = calls;
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [{ lang: "en-US", localService: true }],
        cancel: () => {
          calls.cancels++;
        },
        speak: (u: SpeechSynthesisUtterance) => {
          calls.texts.push(u.text);
        },
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class {
        text: string;
        constructor(text: string) {
          this.text = text;
        }
      },
    });
  });
  await page.goto("./#/lessons/day-001");
  await page
    .getByRole("button", { name: /朗读：/ })
    .first()
    .click();
  await expect(page.getByRole("button", { name: "停止朗读" })).toBeVisible();
  const before = await page.evaluate(
    () =>
      (
        window as unknown as {
          speechCalls: { texts: string[]; cancels: number };
        }
      ).speechCalls,
  );
  expect(before.texts).toEqual(["Time to get up!"]);
  await page.getByRole("link", { name: "02 全部课程" }).click();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { speechCalls: { cancels: number } }).speechCalls
          .cancels,
    ),
  ).toBeGreaterThan(before.cancels);
});
