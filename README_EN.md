# 👁️ Agent Vision Skill

**Give AI agents without native vision a pair of eyes—zero configuration, ready to use.**

[中文](README.md)

Add image understanding to AI agents that lack native vision. The core advantage: **no API key, no base URL, and no environment variables**. Install the Skill, refresh the Skill index, and the agent can analyze images on demand.

## ✨ Why this Skill?

- **Zero configuration** — No API key, base URL, or environment variables required. Install by pasting a prompt into an agent, running one interactive command, or copying the directory manually.
- **Broad compatibility** — Follows the [Agent Skills specification](https://agentskills.io/specification) and works with agent frameworks that support the specification and can execute Node.js commands.
- **Local, remote, and attached images** — Supports JPEG, PNG, GIF, WebP, and BMP through local paths, HTTP/HTTPS URLs, and host-accessible image attachments.
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

Confirm that Node.js 18 or newer is available. Download the repository into a temporary directory and copy only skills/agent-vision into the selected location. For a project installation, use the project root, or the Git repository root when applicable. Remove the temporary files afterward.

If the target directory already exists, do not overwrite it. Tell me that an installation already exists and ask whether I want to update or cancel; replace the directory only after I confirm the update.

After installation, confirm that the target contains SKILL.md and scripts/vision.js, and verify that the current agent can discover agent-vision. Report the actual installation path and whether I need to restart or open a new session.

This Skill is fixed to OpenCode Zen's mimo-v2.5-free. Do not ask me for an API key, base URL, or model name. Do not inspect or modify unrelated files, or read or print credentials.

If the current framework cannot discover the selected .agents/skills directory, do not copy the Skill elsewhere without permission. Explain the problem first, then ask whether I want to use that framework's official Skill directory.
```

### Install with Skills CLI

Run these commands yourself in a regular interactive terminal; do not hand them to an agent.

Choose the installation scope interactively:

```bash
npx --yes skills add 5258MF/agent-vision-skill --skill agent-vision -a universal --copy
```

`-a universal` fixes the destination to `.agents/skills`; `--copy` uses real files instead of symbolic links.

Fix the scope to user-level `~/.agents/skills/agent-vision`:

```bash
npx --yes skills add 5258MF/agent-vision-skill --skill agent-vision -a universal --copy -g -y
```

Fix the scope to the current project at `<current-directory>/.agents/skills/agent-vision`:

```bash
npx --yes skills add 5258MF/agent-vision-skill --skill agent-vision -a universal --copy -y
```

`npx --yes` skips the npm prompt; the trailing `-y` skips Skills CLI prompts. Treat the path reported by the CLI as authoritative.

### Download and install manually

Confirm that Node.js 18 or newer is installed, download this repository, and choose one installation scope:

```text
User-level (recommended): ~/.agents/skills/agent-vision/
Current project:          <project-root>/.agents/skills/agent-vision/
```

Copy the complete `skills/agent-vision` directory into the selected location; use the project root for a project installation. If the target already exists, confirm before replacing it.

Confirm that the target contains `SKILL.md` and `scripts/vision.js`, then reopen the session or refresh the Skill index.

`.agents/skills` is the preferred common location, but not every framework guarantees support. If the current agent cannot discover the Skill, use the Skill directory documented by that framework.

## Update, inspect, and remove

### Update

Reinstall with the original method and scope. For an agent-assisted or manual installation, replace only the `agent-vision` directory. For a Skills CLI installation, rerun the matching `skills add` command above to preserve the `universal` and `--copy` settings.

### Inspect

Confirm that the installation directory contains `SKILL.md` and `scripts/vision.js`, then run:

```bash
node "<actual-install-path>/scripts/vision.js" --help
```

Confirm that the current agent can discover `agent-vision`. If it is still unavailable, reopen the session or refresh the Skill index. Skills CLI users can also inspect the installation record:

Project-level:

```bash
npx --yes skills list
```

User-level:

```bash
npx --yes skills list -g
```

### Remove

For an agent-assisted or manual installation, delete only the `agent-vision` directory, not its parent `.agents/skills`. For a Skills CLI installation, use the matching command:

Project-level:

```bash
npx --yes skills remove agent-vision -y
```

User-level:

```bash
npx --yes skills remove agent-vision -g -y
```

Do not add `-a universal` when removing the Skill, because the shared directory may otherwise be retained. After confirming that the directory is gone, reopen the session or refresh the Skill index.

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
node skills/agent-vision/scripts/vision.js "data:image/png;base64,<base64-data>" "Read the visible text"
cat image-data-url.txt | node skills/agent-vision/scripts/vision.js - "Analyze this image"
```

Local images and decoded data URLs are limited to 10 MiB. The script makes limited retries for empty responses and temporary service errors; retry later if the free endpoint returns 429. Run `node skills/agent-vision/scripts/vision.js --help` for the command syntax.

## How it works

```text
Task requires visual evidence
       ↓
Agent loads agent-vision/SKILL.md
       ↓
Agent runs scripts/vision.js
       ↓
Image path, URL, Base64 data URL, or host-accessible attachment
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
