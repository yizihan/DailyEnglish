import { unified } from "unified";
import remarkParse from "remark-parse";
import { parseDocument } from "yaml";
import { z } from "zod";
import type { RootContent, Root } from "mdast";
import type { Lesson, Rich, Item, Task } from "../src/domain/content";

const metaSchema = z
  .object({
    schemaVersion: z.literal(1),
    courseId: z.literal("parent-child-english"),
    id: z.string().regex(/^day-\d{3,}$/),
    order: z.number().int().positive(),
    title: z.string().min(1),
    kind: z.enum(["daily", "assessment"]),
    theme: z.enum([
      "morning",
      "breakfast",
      "homecoming",
      "mealtime",
      "chores",
      "outdoors",
      "bedtime",
    ]),
    estimatedMinutes: z.number().int().min(1).max(60),
    revision: z.number().int().positive(),
    reviewStatus: z.enum(["draft", "curated", "reviewed"]),
    source: z.string().min(1),
  })
  .strict();
const escape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
type Node = {
  type: string;
  value?: string;
  children?: Node[];
  ordered?: boolean;
  position?: { start: { line: number } };
};
function render(node: Node): Rich {
  const children = () => (node.children ?? []).map(render);
  if (node.type === "text")
    return { html: escape(node.value ?? ""), text: node.value ?? "" };
  if (node.type === "inlineCode")
    return {
      html: `<code>${escape(node.value ?? "")}</code>`,
      text: node.value ?? "",
    };
  if (node.type === "break") return { html: "<br>", text: "\n" };
  const tags: Record<string, string> = {
    paragraph: "p",
    strong: "strong",
    emphasis: "em",
    listItem: "li",
    list: node.ordered ? "ol" : "ul",
  };
  if (!tags[node.type])
    throw new Error(
      `不支持 ${node.type} 节点，正文第 ${node.position?.start.line ?? "?"} 行`,
    );
  const parts = children();
  return {
    html: `<${tags[node.type]}>${parts.map((p) => p.html).join("")}</${tags[node.type]}>`,
    text: parts.map((p) => p.text).join(node.type === "list" ? "\n" : ""),
  };
}
const empty: Rich = { html: "", text: "" };
const rich = (nodes: RootContent[]): Rich => {
  const values = nodes.map((n) => render(n as Node));
  return {
    html: values.map((v) => v.html).join(""),
    text: values.map((v) => v.text).join("\n"),
  };
};
const label = (node: RootContent) =>
  node.type === "heading"
    ? node.children.map((n) => ("value" in n ? n.value : "")).join("")
    : "";
export function parseLesson(
  source: string,
  filename: string,
  allowDraft = false,
): Lesson {
  try {
    const lines = source.replace(/^\uFEFF/, "").split(/\r?\n/);
    if (lines.shift() !== "---") throw new Error("缺少 YAML 元数据");
    const end = lines.indexOf("---");
    if (end < 0) throw new Error("元数据未闭合");
    const yaml = parseDocument(lines.slice(0, end).join("\n"), {
      uniqueKeys: true,
    });
    if (yaml.errors.length) throw new Error(yaml.errors[0].message);
    const meta = metaSchema.parse(yaml.toJS());
    if (meta.reviewStatus === "draft" && !allowDraft)
      throw new Error("草稿不能发布");
    if (filename !== `${meta.id}.md`)
      throw new Error("文件名必须与课程 ID 一致");
    const tree = unified()
      .use(remarkParse)
      .parse(lines.slice(end + 1).join("\n")) as Root;
    const sections = new Map<string, RootContent[]>();
    let active = "";
    for (const node of tree.children) {
      if (node.type === "heading" && node.depth === 2) {
        active = label(node);
        if (sections.has(active)) throw new Error(`重复章节 ${active}`);
        sections.set(active, []);
      } else {
        if (!active) throw new Error("正文必须从二级标题开始");
        sections.get(active)!.push(node);
      }
    }
    const allowed = [
      "学习目标",
      "热身与复习",
      "今日指令",
      "孩子动作测评",
      "家长表达自测",
    ];
    for (const name of sections.keys())
      if (!allowed.includes(name)) throw new Error(`未知章节 ${name}`);
    const required = (name: string) => {
      const nodes = sections.get(name);
      if (!nodes?.length) throw new Error(`缺少 ${name}`);
      return nodes;
    };
    const parseItems = (name: string, fields: string[]) => {
      const prefix =
        name === "今日指令" ? "i" : name === "孩子动作测评" ? "c" : "p";
      const result: { id: string; fields: Record<string, Rich> }[] = [];
      let current: (typeof result)[number] | undefined;
      let fieldName = "";
      let buffer: RootContent[] = [];
      const flush = () => {
        if (current && fieldName) {
          if (!buffer.length) throw new Error(`空字段 ${fieldName}`);
          current.fields[fieldName] = rich(buffer);
          buffer = [];
        }
      };
      for (const node of required(name)) {
        if (node.type === "heading" && node.depth === 3) {
          flush();
          current = { id: label(node), fields: {} };
          if (!new RegExp(`^${meta.id}-${prefix}\\d{2,}$`).test(current.id))
            throw new Error(`非法条目 ID ${current.id}`);
          result.push(current);
          fieldName = "";
        } else if (node.type === "heading" && node.depth === 4) {
          flush();
          fieldName = label(node);
          if (
            !current ||
            !fields.includes(fieldName) ||
            current.fields[fieldName]
          )
            throw new Error(`未知或重复字段 ${fieldName}`);
        } else {
          if (!current || !fieldName)
            throw new Error("条目需要三级 ID 和四级字段标题");
          buffer.push(node);
        }
      }
      flush();
      for (const item of result)
        for (const f of fields)
          if (!item.fields[f]?.text.trim())
            throw new Error(`${item.id} 缺少 ${f}`);
      return result;
    };
    const items: Item[] = parseItems("今日指令", [
      "标题",
      "英文",
      "中文",
      "发音提示",
      "动作引导",
      "替换与延伸表达",
    ]).map(({ id, fields: f }) => ({
      id,
      title: f["标题"],
      en: f["英文"],
      zh: f["中文"],
      pronunciation: f["发音提示"],
      action: f["动作引导"],
      alternatives: f["替换与延伸表达"],
    }));
    const tasks = (child: boolean): Task[] =>
      meta.kind === "daily"
        ? []
        : parseItems(
            child ? "孩子动作测评" : "家长表达自测",
            child
              ? ["标题", "情境", "英文", "观察要点"]
              : ["标题", "中文情境", "参考英文"],
          ).map(({ id, fields: f }) => ({
            id,
            title: f["标题"],
            prompt: f[child ? "情境" : "中文情境"],
            answer: f[child ? "英文" : "参考英文"],
            observation: f["观察要点"] ?? empty,
          }));
    const childTasks = tasks(true),
      parentTasks = tasks(false);
    if (
      meta.kind === "daily" &&
      (sections.has("孩子动作测评") || sections.has("家长表达自测"))
    )
      throw new Error("普通课不能混入测评章节");
    if (
      items.length < 1 ||
      items.length > 8 ||
      childTasks.length > 10 ||
      parentTasks.length > 10
    )
      throw new Error("条目数量超出范围");
    const allIds = [...items, ...childTasks, ...parentTasks].map((i) => i.id);
    if (new Set(allIds).size !== allIds.length) throw new Error("重复条目 ID");
    const goal = rich(required("学习目标")),
      warmup = rich(required("热身与复习"));
    return {
      ...meta,
      reviewStatus: meta.reviewStatus === "reviewed" ? "reviewed" : "curated",
      goal,
      warmup,
      items,
      childTasks,
      parentTasks,
      instructionCount: items.length,
      taskCount: childTasks.length + parentTasks.length,
      search: [
        meta.title,
        meta.theme,
        ...items.flatMap((i) => [i.en.text, i.zh.text]),
      ]
        .join(" ")
        .replace(/‿/g, " "),
    };
  } catch (error) {
    throw new Error(
      `${filename}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
export function validateCollection(lessons: Lesson[]) {
  for (const key of ["id", "order"] as const)
    if (new Set(lessons.map((l) => l[key])).size !== lessons.length)
      throw new Error(`课程 ${key} 重复`);
  for (const lesson of lessons)
    for (const ref of lesson.warmup.text.match(/day-\d{3,}/g) ?? []) {
      const target = lessons.find((l) => l.id === ref);
      if (!target || target.order >= lesson.order)
        throw new Error(`${lesson.id}: 复习引用不存在或不是较早课程 ${ref}`);
    }
}
