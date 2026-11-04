// One-time, explicit adapter for the seven supplied originals; not the publishing parser.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const root = new URL("../content/", import.meta.url);
mkdirSync(new URL("lessons/", root), { recursive: true });
const themes = [
  "morning",
  "breakfast",
  "homecoming",
  "mealtime",
  "chores",
  "outdoors",
  "bedtime",
];
const clean = (s) => s.replace(/^\*\s*/, "").trim();
const field = (name, value) => `#### ${name}\n\n${value.trim()}\n\n`;
for (let day = 1; day <= 7; day++) {
  const id = `day-${String(day).padStart(3, "0")}`;
  const raw = readFileSync(new URL(`${id}.md`, root), "utf8");
  const title = raw.match(/Day \d+ · (.*?)（/)[1];
  let output = `---\nschemaVersion: 1\ncourseId: parent-child-english\nid: ${id}\norder: ${day}\ntitle: ${title}\nkind: ${day === 7 ? "assessment" : "daily"}\ntheme: ${themes[day - 1]}\nestimatedMinutes: 15\nrevision: 1\nreviewStatus: curated\nsource: 用户提供的大模型辅助课程 ${id}.md，已整理，发音说明未经专业审校\n---\n\n## 学习目标\n\n${day === 7 ? "用动作与情景表达回顾本周，再练习两句睡前指令。" : `在${title}场景中练习英语，孩子听懂并做动作即可。`}\n\n## 热身与复习\n\n`;
  if (day < 7) {
    const warm = raw
      .slice(raw.indexOf("\n") + 1, raw.indexOf("* **二、"))
      .split("\n")
      .filter((l) => l.trim() && !l.includes("**一、"))
      .map(clean)
      .join("\n\n");
    output += warm + "\n\n## 今日指令\n\n";
    const blocks = [
      ...raw.matchAll(
        /\* \*\*指令 (\d+)：(.*?)\*\*\r?\n([\s\S]*?)(?=\* \*\*指令 \d+：|$)/g,
      ),
    ];
    if (blocks.length !== 4) throw new Error(`${id}: expected 4 commands`);
    for (const [, num, label, body] of blocks) {
      const line = body.match(/\* \*\*今日指令\*\*：(.*)/)[1];
      const sep = line.indexOf("（");
      let zh = line
        .slice(sep + 1, line.lastIndexOf("）"))
        .replace(/\*\(融入.*?\)\*/, "");
      output +=
        `### ${id}-i${num.padStart(2, "0")}\n\n` +
        field("标题", label) +
        field("英文", line.slice(0, sep)) +
        field("中文", zh);
      output += field("发音提示", body.match(/发音标注\*\*：(.*)/)[1]);
      output += field("动作引导", body.match(/动作引导与替换\*\*：(.*)/)[1]);
      output += field("替换与延伸表达", body.match(/同句型替换\*：(.*)/)[1]);
    }
    if (day === 6)
      output = output.replace(
        "**hurry**‿up, let's **go**!",
        "**hurry**‿up! **Grab** your **bag** and let's **go**!",
      );
  } else {
    output +=
      "先回顾复习页中的到期课程。测评时家长说英文，孩子听懂做动作，不要求英文回答。\n\n## 今日指令\n\n";
    const bedtime = [
      [
        "穿睡衣上床",
        "**Put**‿on your **pajamas** and **get** **in** **bed**.",
        "穿上睡衣，上床睡觉吧。",
        "`pajamas` `/pəˈdʒɑːməz/` 重音在 `ja`。",
        "拿出睡衣，指向床，邀请孩子准备睡觉。",
      ],
      [
        "闭眼道晚安",
        "**Close** your **eyes**. **Good** **night**!",
        "闭上眼睛。晚安！",
        "用轻柔、自然的语气示范。",
        "轻轻拍拍孩子的被子。",
      ],
    ];
    bedtime.forEach((v, i) => {
      output +=
        `### ${id}-i0${i + 1}\n\n` +
        ["标题", "英文", "中文", "发音提示", "动作引导"]
          .map((f, j) => field(f, v[j]))
          .join("") +
        field("替换与延伸表达", "本课不增加新表达，温柔重复即可。");
    });
    output += "## 孩子动作测评\n\n";
    for (const m of raw.matchAll(
      /\* \*\*第 (\d+) 题（(.*?)）\*\*：(.*?)：\*"(.*?)"\*/g,
    )) {
      output +=
        `### ${id}-c0${m[1]}\n\n` +
        field("标题", m[2]) +
        field("情境", m[3]) +
        field("英文", m[4]) +
        field(
          "观察要点",
          "观察孩子是否听懂并完成指令中的动作，记录是否需要手势提示。",
        );
    }
    output += "## 家长表达自测\n\n";
    for (const m of raw.matchAll(
      /\* \*\*情景 (\d+)\*\*：(.*?)\r?\n\*（自查：(.*?)）\*/g,
    )) {
      const prompt =
        m[1] === "3"
          ? "晚饭端上温热的固体食物，提醒孩子小心烫，先吹一吹，小咬一口，慢慢嚼。"
          : m[2];
      output +=
        `### ${id}-p0${m[1]}\n\n` +
        field("标题", `情景 ${m[1]}`) +
        field("中文情境", prompt) +
        field("参考英文", m[3]);
    }
  }
  writeFileSync(new URL(`lessons/${id}.md`, root), output);
}
console.log("Converted 7 originals, preserved source files.");
