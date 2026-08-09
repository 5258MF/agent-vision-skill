# 👁️ Agent Vision Skill

**给不具备原生视觉能力的智能体一双眼睛 —— 无需配置，安装即用。**

[English](README_EN.md)

为非多模态 AI 智能体补充视觉能力。核心特点是：**无需 API Key、Base URL 或任何环境变量**。安装并刷新 Skill 索引后，智能体即可按需分析图片。

## ✨ 为什么选这个 Skill？

- **零配置，开箱即用** —— 不需要申请 API Key，不需要填写 Base URL，不需要设置环境变量。使用一条 `npx` 命令即可完成安装。
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

先确认 Node.js 版本不低于 18，然后优先执行：
npx --yes skills add 5258MF/agent-vision-skill --skill agent-vision -g -y --copy

安装后确认当前智能体能够发现 agent-vision，告诉我实际安装路径，以及是否需要重启或新建会话。该 Skill 已固定使用 OpenCode Zen 的 mimo-v2.5-free，不要要求我配置 API Key、Base URL 或模型名，也不要修改无关项目文件。如果当前框架不能被 Skills CLI 识别，则根据该框架的 Skill 文档，将仓库中的 skills/agent-vision 复制到用户级 Skill 目录并验证。
```

### 用户自行安装

确认本机已安装 Node.js 18 或更高版本，然后在终端执行：

```bash
npx --yes skills add 5258MF/agent-vision-skill --skill agent-vision -g -y --copy
```

`npx --yes` 会临时下载并运行 Skills CLI，不会把本项目发布到 npm；`agent-vision` 的文件实际从当前 GitHub 仓库下载。`-g` 表示安装到用户级目录，`-y` 跳过 Skills CLI 的交互确认，`--copy` 使用文件复制以避免 Windows 符号链接权限问题。安装完成后，重新打开智能体会话或刷新 Skill 索引。

### 手动复制安装

如果不想使用 Skills CLI，可以下载仓库，将整个 `skills/agent-vision` 目录复制到框架支持的 Skill 目录，并保持目录名为 `agent-vision`。常见位置：

```text
通用项目级：<project>/.agents/skills/agent-vision/
通用用户级：~/.agents/skills/agent-vision/
OpenCode 项目级：<project>/.opencode/skills/agent-vision/
OpenCode 用户级：~/.config/opencode/skills/agent-vision/
```

其他框架请使用其 Agent Skills 文档规定的目录。安装后确认目标目录中同时存在 `SKILL.md` 和 `scripts/vision.js`。

## 更新、检查与卸载

```bash
# 更新全局安装
npx --yes skills update agent-vision -g -y

# 检查全局 Skill
npx --yes skills list -g

# 卸载全局安装
npx --yes skills remove agent-vision -g -y
```

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
