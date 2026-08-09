# Agent Vision Skill

[English](README_EN.md)

一个为智能体补充图像理解能力的通用 Agent Skill。它把本地图片或网络图片发送给 OpenCode Zen 的 `mimo-v2.5-free`，再将模型返回的文字结果交给当前智能体继续处理。

本项目面向兼容 [Agent Skills 规范](https://agentskills.io/specification)、允许执行 Node.js 命令并可访问外网的智能体框架。

## 特性

- 支持本地图片和 HTTP(S) 图片 URL
- 支持 JPEG、PNG、GIF、WebP 和 BMP
- 支持普通文本和 `--json` 输出
- 固定使用 `mimo-v2.5-free`，无需 API Key、Base URL 或模型配置
- 运行时零第三方 npm 依赖，仅需 Node.js 18 或更高版本

当前固定配置：

```text
Model:    mimo-v2.5-free
Endpoint: https://opencode.ai/zen/v1/chat/completions
Auth:     none
```

## 安装

### 用户自行安装（推荐）

确认本机已安装 Node.js 18 或更高版本，然后在终端执行：

```bash
npx --yes skills add 5258MF/agent-vision-skill --skill agent-vision -g -y --copy
```

`npx --yes` 会临时下载并运行 Skills CLI，不会把本项目发布到 npm；`agent-vision` 的文件实际从当前 GitHub 仓库下载。`-g` 表示安装到用户级目录，`-y` 跳过 Skills CLI 的交互确认，`--copy` 使用文件复制以避免 Windows 符号链接权限问题。安装完成后，重新打开智能体会话或刷新 Skill 索引。

### 复制给 Agent 自动安装

把下面这段话直接发给支持终端操作的 Agent：

> 请帮我安装 `agent-vision` Skill：
> https://github.com/5258MF/agent-vision-skill
>
> 先确认 Node.js 版本不低于 18，然后优先执行：
> `npx --yes skills add 5258MF/agent-vision-skill --skill agent-vision -g -y --copy`
>
> 安装后确认当前智能体能够发现 `agent-vision`，告诉我实际安装路径，以及是否需要重启或新建会话。该 Skill 已固定使用 OpenCode Zen 的 `mimo-v2.5-free`，不要要求我配置 API Key、Base URL 或模型名，也不要修改无关项目文件。如果当前框架不能被 Skills CLI 识别，则根据该框架的 Skill 文档，将仓库中的 `skills/agent-vision` 复制到用户级 Skill 目录并验证。

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

智能体会根据 `SKILL.md` 自动调用脚本。在仓库中也可以手动执行：

```bash
node skills/agent-vision/scripts/vision.js "./screenshot.png" "请提取截图中的报错信息"
node skills/agent-vision/scripts/vision.js "https://example.com/image.png" "描述这张图片"
node skills/agent-vision/scripts/vision.js --json "./chart.png" "总结图表趋势"
```

本地图片最大为 10 MiB。运行 `node skills/agent-vision/scripts/vision.js --help` 可查看命令格式。

## 工作方式

```text
用户请求分析图片
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
