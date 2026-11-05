# 课程内容维护

`day-001.md` 至 `day-007.md` 是用户原稿。`lessons/*.md` 是网站正式内容源。构建只扫描 lessons，保留原稿不会产生重复课程。

新增课程最简单的方法：复制相同类型的已整理文件，修改元数据及全部条目 ID，再替换正文。

普通课参考 [day-001](lessons/day_001.md)，周测参考 [day-007](lessons/day_007.md)。一个文件一课，UTF-8 编码。不要使用 PDF，也不要转义 Markdown 标记。

## 固定结构

文件首部 YAML 字段：schemaVersion=1、courseId=parent-child-english、id、order、title、kind、theme、estimatedMinutes、revision。以上字段必须存在。旧文件中的 reviewStatus 与 source 可保留，也可省略；reviewStatus 不参与构建判断。

- id 使用连字符，例如 day-008；对应文件名使用下划线，例如 day_008.md；order 唯一正整数。
- kind 为 daily 或 assessment。
- theme 为 morning/breakfast/homecoming/mealtime/chores/outdoors/bedtime。
- estimatedMinutes 为 1–60 正整数；revision 从 1 开始，修改已发布课程递增。
- 放入 lessons 的课程均可参与本地预览和构建，审核由内容维护者负责。
- 如需填写 source，请如实说明来源，不编造审核者或音标依据。

正文二级标题：学习目标、热身与复习、今日指令。周测增加孩子动作测评、家长表达自测。

今日指令下每条三级标题使用稳定 ID，例如 day-008-i01；四级字段依次为：标题、英文、中文、发音提示、动作引导、替换与延伸表达，均不能为空。

孩子测评 ID 使用 c01，字段：标题、情境、英文、观察要点。家长测评 ID 使用 p01，字段：标题、中文情境、参考英文。每组 1–10 题，普通课与周测的指令 1–8 条。网站不假设固定数量。

支持段落、粗体、强调、行内代码、列表和换行。禁止原始 HTML、链接、图片、代码块、嵌入资源。英文使用粗体和连读符号 ‿，朗读时自动去除连读符号。不得把展示用拼读当作标准音标。

复习情境可写稳定引用 day-001，但只能引用存在的较早课程。实际日期由网站根据学习记录计算，不写死星期与到期日期。

## 更新步骤

1. 新建或修改 lessons 内 Markdown，保留已有 ID。
2. `npm run content:check` 检查内容结构。
3. 核对中英文一致性、动作提示和发音说明；本地构建可用于进一步验证课程内容。
4. `npm run dev` 查看页面。运行中修改课程会重新生成并刷新。
5. `npm run typecheck`、`npm test`、`npm run build`、`npm run test:e2e` 全部通过后提交。

`public/courses` 是自动生成目录，不编辑、不提交。不要重新运行 convert-originals.mjs 覆盖已修改课程。
