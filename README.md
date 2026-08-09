# 👁️ Agent Vision Skill

**给不具备原生视觉能力的智能体一双眼睛 —— 无需配置，安装即用。**

[English](README_EN.md)

为非多模态 AI 智能体补充视觉能力。核心特点是：**无需 API Key、Base URL 或任何环境变量**。安装并刷新 Skill 索引后，智能体即可按需分析图片。

## ✨ 为什么选这个 Skill？

- **零配置，开箱即用** —— 不需要申请 API Key，不需要填写 Base URL，不需要设置环境变量。支持粘贴给 Agent、运行一条交互式命令或手动复制目录完成安装。
- **通用兼容** —— 遵循 [Agent Skills 规范](https://agentskills.io/specification)，适用于支持该规范且允许执行 Node.js 命令的智能体框架。
- **本地 + 网络图片都支持** —— 支持 JPEG、PNG、GIF、WebP、BMP，本地路径和 HTTP/HTTPS URL 均可。
- **极简依赖** —— 运行时零第三方 npm 依赖，只需 Node.js 18+。
- **灵活输出** —— 支持普通文本和 `--json` 结构化输出，方便后续自动化处理。

> 🚀 核心定位：让没有原生视觉能力的 AI 在 Agent 框架中通过调用本 Skill 获得图像理解能力。无需额外配置，安装即可使用。

## 安装

### 复制给 Agent 自动安装（推荐）

把下面这段话直接发给支持终端操作的 Agent：

```text
请帮我安装 agent-vision Skill：
https://github.com/5258MF/agent-vision-skill

执行任何文件写入前，先询问我要安装到哪个范围：

1. 用户级（推荐）：~/.agents/skills/agent-vision
2. 当前项目：<项目根目录>/.agents/skills/agent-vision

等待我明确选择后再继续。不要同时安装到两个位置，也不要向所有智能体框架批量复制。

确认 Node.js 版本不低于 18。将仓库下载到临时目录，只把 skills/agent-vision 复制到选定位置；项目级安装使用项目根目录，如果当前目录在 Git 仓库内，就使用 Git 仓库根目录。完成后清理临时文件。

如果目标目录已经存在，不要直接覆盖。先告诉我是已有安装，并询问我要更新还是取消；只有在我确认更新后才能替换该目录。

安装后确认目标目录中存在 SKILL.md 和 scripts/vision.js，并验证当前智能体能否发现 agent-vision。告诉我实际安装路径，以及是否需要重启或新建会话。

该 Skill 已固定使用 OpenCode Zen 的 mimo-v2.5-free，不要要求我配置 API Key、Base URL 或模型名。不要检查或修改无关文件，也不要读取或输出凭据。

如果当前框架无法发现选定的 .agents/skills 目录，不要擅自复制到其他位置。先说明情况，再询问我是否改用该框架官方的 Skill 目录。
```

### Skills CLI 命令安装

请本人在普通交互式终端中运行，不要交给 Agent 执行。

交互选择安装范围：

```bash
npx --yes skills add 5258MF/agent-vision-skill --skill agent-vision -a universal --copy
```

`-a universal` 固定使用 `.agents/skills`，`--copy` 使用实际文件而不是符号链接。

固定为用户级 `~/.agents/skills/agent-vision`：

```bash
npx --yes skills add 5258MF/agent-vision-skill --skill agent-vision -a universal --copy -g -y
```

固定为当前项目 `<当前目录>/.agents/skills/agent-vision`：

```bash
npx --yes skills add 5258MF/agent-vision-skill --skill agent-vision -a universal --copy -y
```

`npx --yes` 跳过 npm 提示；命令末尾的 `-y` 跳过 Skills CLI 提示。安装路径以 CLI 输出为准。

### 下载仓库手动安装

确认本机已安装 Node.js 18 或更高版本，下载本仓库并选择一个安装范围：

```text
用户级（推荐）：~/.agents/skills/agent-vision/
当前项目：      <项目根目录>/.agents/skills/agent-vision/
```

将整个 `skills/agent-vision` 目录复制到选定位置；项目级安装使用项目根目录。如果目标目录已存在，请确认后再替换。

确认目标目录中存在 `SKILL.md` 和 `scripts/vision.js`，然后重新打开会话或刷新 Skill 索引。

`.agents/skills` 是首选通用位置，但不是所有框架都保证支持。如果当前智能体无法发现该 Skill，请按照该框架的官方文档改用其 Skill 目录。

## 更新、检查与卸载

### 更新

按原安装方式和原范围重新安装。Agent 或手动安装只替换 `agent-vision` 目录；Skills CLI 安装重新运行上方对应的 `skills add` 命令，以保留 `universal` 和 `--copy` 设置。

### 检查

确认安装目录中存在 `SKILL.md` 和 `scripts/vision.js`，并运行：

```bash
node "<实际安装路径>/scripts/vision.js" --help
```

确认当前智能体能够发现 `agent-vision`；如果仍不可见，请重新打开会话或刷新 Skill 索引。Skills CLI 用户还可以检查安装记录：

项目级：

```bash
npx --yes skills list
```

用户级：

```bash
npx --yes skills list -g
```

### 卸载

Agent 或手动安装只删除 `agent-vision` 目录，不要删除父级 `.agents/skills`。Skills CLI 安装使用对应命令：

项目级：

```bash
npx --yes skills remove agent-vision -y
```

用户级：

```bash
npx --yes skills remove agent-vision -g -y
```

卸载时不要添加 `-a universal`，否则共享目录中的文件可能被保留。确认目录已删除后，重新打开会话或刷新 Skill 索引。

## 使用

安装后，直接向智能体提出与图片有关的问题，例如：

```text
请提取这张报错截图里的文字并分析原因。
对比 before.png 和 after.png 的界面变化。
总结这张图表的主要趋势，不确定的地方请标出来。
```

即使用户没有明确要求“分析图片”，当任务需要检查截图、渲染后的界面、图表或其他视觉证据时，兼容框架中的智能体也可能根据 `SKILL.md` 主动调用脚本。例如，“按照 `mockups/checkout.png` 实现页面”可以触发智能体先分析参考图，再继续完成任务。

自动触发不是强制保证。它取决于框架是否启用 Agent Skills、当前模型是否选择加载该 Skill、是否允许执行 Node.js 命令，以及图片路径或 URL 是否可访问；也可以由具备相应能力的框架安全生成并保存截图。没有可访问的图片且无法截图时，智能体应请求用户提供图片，而不是猜测画面内容。

在仓库中也可以手动执行：

```bash
node skills/agent-vision/scripts/vision.js "./screenshot.png" "请提取截图中的报错信息"
node skills/agent-vision/scripts/vision.js "https://example.com/image.png" "描述这张图片"
node skills/agent-vision/scripts/vision.js --json "./chart.png" "总结图表趋势"
```

本地图片最大为 10 MiB。运行 `node skills/agent-vision/scripts/vision.js --help` 可查看命令格式。

## 工作方式

```text
任务需要视觉证据
       ↓
智能体加载 agent-vision/SKILL.md
       ↓
调用 scripts/vision.js
       ↓
图片 URL 或 Base64 data URL
       ↓
OpenCode Zen / mimo-v2.5-free
       ↓
文字结果返回当前智能体
```

这不是本地视觉模型。图片会被发送到 OpenCode Zen；不要用它处理密码、密钥、身份证件、商业机密或其他敏感图片。`mimo-v2.5-free` 的免费政策和匿名访问方式可能由 OpenCode 调整；如果接口策略发生变化，脚本会返回明确的 HTTP 错误，不会自动切换到付费模型。

## 致谢

本项目受 [`asuojun/claude-vision-skill`](https://github.com/asuojun/claude-vision-skill) 启发。

## 相关文档

- [Agent Skills specification](https://agentskills.io/specification)
- [OpenCode Agent Skills](https://opencode.ai/docs/skills/)
- [OpenCode Zen](https://opencode.ai/docs/zh-cn/zen)
- [MiMo 图像理解](https://mimo.mi.com/docs/en-US/quick-start/usage-guide/multimodal-understanding/image-understanding)

## License

[MIT](LICENSE)
