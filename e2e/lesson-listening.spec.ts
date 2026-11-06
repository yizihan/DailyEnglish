import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    lessonSpeech: { calls: SpeechSynthesisUtterance[]; cancels: number };
  }
}

const bilingual = [
  { lang: "en-US", localService: true },
  { lang: "zh-CN", localService: true },
];
async function openLesson(page: Page, day = "001", voices = bilingual) {
  await page.addInitScript((available) => {
    const speech = window.lessonSpeech = { calls: [] as SpeechSynthesisUtterance[], cancels: 0 };
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => available,
        speak: (utterance: SpeechSynthesisUtterance) => speech.calls.push(utterance),
        cancel: () => speech.cancels++,
        addEventListener() {},
        removeEventListener() {},
      },
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class { constructor(public text: string) {} },
    });
  }, voices);
  await page.clock.install({ time: new Date("2026-11-06T08:00:00Z") });
  await page.clock.pauseAt(new Date("2026-11-06T08:01:00Z"));
  await page.goto(`./#/lessons/day-${day}`);
  await expect(page.getByRole("button", { name: "听本课重点" })).toBeVisible();
}

function texts(page: Page) {
  return page.evaluate(() => window.lessonSpeech.calls.map((utterance) => utterance.text));
}
function finishUtterance(page: Page, index = -1) {
  return page.evaluate((i) => {
    const utterance = window.lessonSpeech.calls.at(i)!;
    utterance.onend!(new Event("end") as SpeechSynthesisEvent);
  }, index);
}
function failUtterance(page: Page) {
  return page.evaluate(() => {
    const utterance = window.lessonSpeech.calls.at(-1)!;
    utterance.onerror!(new Event("error") as SpeechSynthesisErrorEvent);
  });
}

const firstMeaning = "该起床啦！";
for (const { day, lines } of [
  {
    day: "001",
    lines: [
      [firstMeaning, "Time to get up!"],
      ["穿上你的上衣。", "Put on your shirt."],
      ["把夹克拉链拉上。", "Zip up your jacket."],
      ["去洗脸、刷牙吧。", "Go wash your face and brush your teeth."],
    ],
  },
  {
    day: "007",
    lines: [
      ["穿上外套，拉好拉链！然后脱掉鞋子。", "Put on your jacket and zip it up! Then take off your shoes."],
      ["喝点水，再用餐巾擦擦嘴。", "Drink some water, and wipe your mouth with a napkin."],
      ["把积木放进盒子里，再把纸扔进垃圾桶。", "Put the blocks in the box, and throw the paper in the trash can."],
      ["牵着我的手！小心脚下！", "Hold my hand! Watch your step!"],
      ["穿上睡衣，上床睡觉吧。", "Put on your pajamas and get in bed."],
      ["闭上眼睛。晚安！", "Close your eyes. Good night!"],
    ],
  },
]) {
  test(`day ${day} reads each meaning before speaking its English instruction twice`, async ({ page }) => {
    await openLesson(page, day);
    const progressKey = "dailyenglish:parent-child-english:v1";
    const before = await page.evaluate((key) => localStorage.getItem(key), progressKey);
    await page.getByRole("button", { name: "听本课重点" }).click();
    const expected: string[] = [];
    for (const [index, [meaning, line]] of lines.entries()) {
      expected.push(meaning);
      expect(await texts(page)).toEqual(expected);
      await finishUtterance(page);
      await expect(page.getByRole("status")).toHaveText(`第 ${index + 1} / ${lines.length} 条`);
      expected.push(line);
      expect(await texts(page)).toEqual(expected);
      await finishUtterance(page);
      await page.clock.fastForward(1999);
      expect(await texts(page)).toEqual(expected);
      await page.clock.fastForward(1);
      expected.push(line);
      expect(await texts(page)).toEqual(expected);
      await finishUtterance(page);
      if (index + 1 < lines.length) {
        await page.clock.fastForward(2999);
        expect(await texts(page)).toEqual(expected);
        await page.clock.fastForward(1);
      }
    }
    await expect(page.getByRole("button", { name: "听本课重点" })).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("本课重点已播完。");
    await page.clock.fastForward(10000);
    expect(await texts(page)).toEqual(expected);
    expect(await page.evaluate(() => window.lessonSpeech.calls.map((u) => u.voice?.lang)))
      .toEqual(lines.flatMap(() => ["zh-CN", "en-US", "en-US"]));
    expect(await page.evaluate((key) => localStorage.getItem(key), progressKey)).toBe(before);
  });
}

test("stop cancels both the meaning and the pending repeat, and replay starts over", async ({ page }) => {
  await openLesson(page);
  const start = page.getByRole("button", { name: "听本课重点" });
  const stop = page.getByRole("button", { name: "停止播放" });
  await start.click();
  const before = await page.evaluate(() => window.lessonSpeech.cancels);
  await stop.click();
  expect(await page.evaluate(() => window.lessonSpeech.cancels)).toBeGreaterThan(before);
  await start.click();
  await finishUtterance(page, 0); // Stale end from the canceled Chinese utterance.
  expect(await texts(page)).toEqual([firstMeaning, firstMeaning]);
  await finishUtterance(page);
  await finishUtterance(page);
  await stop.click();
  await page.clock.fastForward(5000);
  expect(await texts(page)).toEqual([firstMeaning, firstMeaning, "Time to get up!"]);
  await start.click();
  expect((await texts(page)).at(-1)).toBe(firstMeaning);
});

test("a single instruction and the lesson player can take over from each other", async ({ page }) => {
  await openLesson(page);
  const single = page.getByRole("button", { name: /^朗读：/ }).first();
  const start = page.getByRole("button", { name: "听本课重点" });
  await single.click();
  await start.click();
  await finishUtterance(page);
  await single.click();
  await finishUtterance(page, 2); // Late end from the interrupted English instruction.
  await page.clock.fastForward(5000);
  expect(await texts(page)).toEqual(["Time to get up!", firstMeaning, "Time to get up!", "Time to get up!"]);
  await expect(start).toBeVisible();
  await expect(page.getByRole("button", { name: /^停止朗读：/ })).toBeVisible();
});

test("switching lessons or leaving the course cancels upcoming speech", async ({ page }) => {
  await openLesson(page);
  const start = page.getByRole("button", { name: "听本课重点" });
  await start.click();
  await finishUtterance(page);
  await finishUtterance(page);
  await page.getByRole("link", { name: "下一课" }).click();
  await expect(page).toHaveURL(/day-002$/);
  await expect(start).toBeVisible();
  await page.clock.fastForward(5000);
  expect(await texts(page)).toEqual([firstMeaning, "Time to get up!"]);
  await start.click();
  await page.getByRole("link", { name: "← 全部课程" }).click();
  await finishUtterance(page);
  await page.clock.fastForward(5000);
  expect(await texts(page)).toHaveLength(3);
});

test("a remote-only Chinese voice waits for the parent on every instruction", async ({ page }) => {
  await openLesson(page, "001", [
    { lang: "zh-CN", localService: false },
    { lang: "en", localService: true },
  ]);
  await page.getByRole("button", { name: "听本课重点" }).click();
  await expect(page.getByRole("status")).toContainText(firstMeaning);
  await page.clock.fastForward(10000);
  expect(await texts(page)).toEqual([]);
  const listen = page.getByRole("button", { name: "听本条英文" });
  await listen.click();
  expect(await texts(page)).toEqual(["Time to get up!"]);
  await finishUtterance(page);
  await page.clock.fastForward(2000);
  await finishUtterance(page);
  await page.clock.fastForward(3000);
  await expect(page.getByRole("status")).toContainText("穿上你的上衣。");
  expect(await texts(page)).toEqual(["Time to get up!", "Time to get up!"]);
  await page.getByRole("button", { name: "停止播放" }).click();
  await expect(listen).not.toBeVisible();
  await page.getByRole("button", { name: "听本课重点" }).click();
  await expect(page.getByRole("status")).toContainText(firstMeaning);
});

test("without local English the lesson stays silent and can be retried", async ({ page }) => {
  await openLesson(page, "001", [
    { lang: "en-US", localService: false },
    { lang: "zh-CN", localService: true },
  ]);
  await page.getByRole("button", { name: "听本课重点" }).click();
  await expect(page.getByRole("status")).toContainText("暂无本地英语朗读");
  await expect(page.getByRole("button", { name: "听本课重点" })).toBeVisible();
  expect(await texts(page)).toEqual([]);
});

test("a legacy child task waits for a parent to explain and retains its English instruction", async ({ page }) => {
  await page.route("**/courses/day-007.json", async (route) => {
    const response = await route.fetch();
    const lesson = await response.json();
    delete lesson.childTasks[0].zh;
    await route.fulfill({ response, json: lesson });
  });
  await openLesson(page, "007");
  await page.getByRole("button", { name: "听本课重点" }).click();
  const english = "Put on your jacket and zip it up! Then take off your shoes.";
  await expect(page.getByRole("status")).toContainText(`请家长用中文解释「${english}」`);
  expect(await texts(page)).toEqual([]);
  await page.getByRole("button", { name: "听本条英文" }).click();
  expect(await texts(page)).toEqual([english]);
});

test("failed Chinese offers the current meaning and failed English ends the session", async ({ page }) => {
  await openLesson(page);
  const start = page.getByRole("button", { name: "听本课重点" });
  await start.click();
  await failUtterance(page);
  await expect(page.getByRole("status")).toContainText(firstMeaning);
  await page.getByRole("button", { name: "听本条英文" }).click();
  await failUtterance(page);
  await expect(start).toBeVisible();
  await expect(page.getByRole("status")).toContainText("本地朗读未能播放");
  await page.clock.fastForward(5000);
  expect(await texts(page)).toEqual([firstMeaning, "Time to get up!"]);
});
