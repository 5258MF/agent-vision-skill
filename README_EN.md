# 👁️ Agent Vision Skill

**Give AI agents without native vision a pair of eyes—zero configuration, ready to use.**

[中文](README.md)

Add image understanding to AI agents that lack native vision. The core advantage: **no API key, no base URL, and no environment variables**. Install the Skill, refresh the Skill index, and the agent can analyze images on demand.

## ✨ Why this Skill?

- **Zero configuration** — No API key, base URL, or environment variables required. Install by pasting a prompt into an agent, running one interactive command, or copying the directory manually.
- **Broad compatibility** — Follows the [Agent Skills specification](https://agentskills.io/specification) and works with agent frameworks that support the specification and can execute Node.js commands.
- **Local and remote images** — Supports JPEG, PNG, GIF, WebP, and BMP through local paths and HTTP/HTTPS URLs.
- **Minimal dependencies** — Has no third-party runtime dependencies and only requires Node.js 18+.
- **Flexible output** — Supports plain text and structured `--json` output for downstream automation.

> 🚀 Core purpose: Give AI agents without native vision access to image understanding by invoking this Skill in compatible agent frameworks. No extra configuration—install and use.

## Installation

### Ask an agent to install it (recommended)

Paste the following message into an agent that can run terminal commands:

```text
Please install the agent-vision Skill for me:
https://github.com/5258MF/agent-vision-skill

Before writing any files, ask me which installation scope I want:

1. User-level (recommended): ~/.agents/skills/agent-vision
2. Current project: <project-root>/.agents/skills/agent-vision

Wait for my explicit choice before continuing. Do not install to both locations or copy the Skill across every agent framework.

Confirm that Node.js 18 or newer is available, then download the repository into a temporary directory and copy only skills/agent-vision into the selected location. For a project-level installation, use the project root; if the current directory is inside a Git repository, prefer the Git repository root. Remove the temporary download after copying.

If the target directory already exists, do not overwrite it. Tell me that an installation already exists and ask whether I want to update or cancel; replace the directory only after I confirm the update.

After installation, confirm that the target contains SKILL.md and scripts/vision.js, and verify that the current agent can discover agent-vision. Report the actual installation path and whether I need to restart or open a new session.

This Skill is fixed to OpenCode Zen's mimo-v2.5-free. Do not ask me for an API key, base URL, or model name, and do not modify unrelated project files.

If the current framework cannot discover the selected .agents/skills directory, do not copy the Skill elsewhere without permission. Explain the problem first, then ask whether I want to use that framework's official Skill directory.
```

### Install with Skills CLI

To install it yourself, run the following command personally in a regular interactive terminal. Do not hand this command to an agent:

```bash
npx --yes skills add 5258MF/agent-vision-skill --skill agent-vision --copy
```

This command intentionally omits `-g` and Skills CLI's `-y`. In a regular terminal, the CLI asks interactively which agent framework and installation scope to use. Select only the framework that needs the Skill, then choose either project or user scope. `npx --yes` only permits npm to download Skills CLI temporarily; `--copy` copies files instead of creating symbolic links.

Skills CLI may switch to non-interactive mode automatically when it detects that it is running inside an AI agent, so do not ask an agent to execute this installation method. If the CLI does not show a selection step or says it will install to multiple unrelated frameworks, stop it immediately and use the agent prompt above or the manual method below. Skills CLI uses the directory defined for the selected framework; use one of the other two methods when you specifically want `.agents/skills`.

### Download and install manually

Confirm that Node.js 18 or newer is installed, download this repository, and choose exactly one installation scope:

```text
User-level (recommended): ~/.agents/skills/agent-vision/
Current project:          <project-root>/.agents/skills/agent-vision/
```

Copy the complete `skills/agent-vision` directory from the repository into the selected location and keep the destination directory name as `agent-vision`. `~` means the current user's home directory. For a project-level installation, use the project root rather than an arbitrary subdirectory. Do not install both copies unless you intentionally need both scopes.

If the target directory already exists, decide whether to update or cancel before replacing it; never overwrite it silently. After installation, confirm that the target contains both `SKILL.md` and `scripts/vision.js`, then reopen the agent session or refresh its Skill index.

`.agents/skills` is the preferred common location, but not every framework guarantees support. If the current agent cannot discover the Skill, use the Skill directory documented by that framework.

## Update, inspect, and remove

### Update

For an agent-assisted or manually copied installation, reuse the agent installation prompt above and choose the same scope as the existing installation. When the agent reports that the directory already exists, confirm the update. To update manually, download the repository again and replace only the installed `agent-vision` directory; do not modify its parent `.agents/skills` directory or other Skills.

For a Skills CLI installation, run the following command and select the original installation scope when prompted:

```bash
npx --yes skills update agent-vision
```

### Inspect

Confirm that the actual installation path contains `SKILL.md` and `scripts/vision.js`, then run:

```bash
node "<actual-install-path>/scripts/vision.js" --help
```

Confirm that the current agent can discover `agent-vision`. If it is still unavailable, reopen the session or refresh the Skill index.

For a Skills CLI installation, you can also inspect project-level and user-level Skills separately:

```bash
npx --yes skills list
npx --yes skills list -g
```

### Remove

For an agent-assisted or manually copied installation, delete only the installed `agent-vision` directory, such as the user-level `~/.agents/skills/agent-vision` or project-level `<project-root>/.agents/skills/agent-vision`. Do not delete the parent `.agents`, `.agents/skills`, or any other Skill directory.

For a Skills CLI installation, run the following interactive command and select only the target you want to remove:

```bash
npx --yes skills remove agent-vision
```

Reopen the session or refresh the Skill index after removal.

## Usage

After installation, ask the agent an image-related question, for example:

```text
Extract the exact error text from this screenshot and explain the likely cause.
Compare the UI differences between before.png and after.png.
Summarize the main trend in this chart and label uncertain details.
```

Even when the user does not explicitly ask for image analysis, an agent in a compatible framework may use `SKILL.md` to invoke the script proactively when a task depends on a screenshot, rendered interface, chart, or other visual evidence. For example, “implement the page to match `mockups/checkout.png`” can trigger inspection of the reference image before implementation continues.

Automatic activation is not guaranteed. It depends on the framework enabling Agent Skills, the current model choosing to load this Skill, permission to execute Node.js commands, and access to the image path or URL; a capable framework may also safely capture and save a screenshot. If no image is accessible and no screenshot can be created, the agent should request one instead of guessing what is visible.

You can also run the script directly from a repository checkout:

```bash
node skills/agent-vision/scripts/vision.js "./screenshot.png" "Extract the error message"
node skills/agent-vision/scripts/vision.js "https://example.com/image.png" "Describe this image"
node skills/agent-vision/scripts/vision.js --json "./chart.png" "Summarize the chart trend"
```

Local images are limited to 10 MiB. Run `node skills/agent-vision/scripts/vision.js --help` for the command syntax.

## How it works

```text
Task requires visual evidence
       ↓
Agent loads agent-vision/SKILL.md
       ↓
Agent runs scripts/vision.js
       ↓
Image URL or Base64 data URL
       ↓
OpenCode Zen / mimo-v2.5-free
       ↓
Textual evidence returns to the agent
```

This is not a local vision model. Images are sent to OpenCode Zen. Do not use it for passwords, keys, identity documents, trade secrets, or other sensitive images. OpenCode may change the free-model or anonymous-access policy for `mimo-v2.5-free`; if that happens, the script returns an explicit HTTP error and does not fall back to a paid model.

## Acknowledgements

Inspired by [`asuojun/claude-vision-skill`](https://github.com/asuojun/claude-vision-skill).

## Related documentation

- [Agent Skills specification](https://agentskills.io/specification)
- [OpenCode Agent Skills](https://opencode.ai/docs/skills/)
- [OpenCode Zen](https://opencode.ai/docs/zen)
- [MiMo image understanding](https://mimo.mi.com/docs/en-US/quick-start/usage-guide/multimodal-understanding/image-understanding)

## License

[MIT](LICENSE)
