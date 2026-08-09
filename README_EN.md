# Agent Vision Skill

[中文](README.md)

A portable Agent Skill that adds image understanding to AI agents. It sends a local image or remote image URL to OpenCode Zen's `mimo-v2.5-free` model, then returns the textual result to the current agent for further work.

This project targets agent frameworks that support the [Agent Skills specification](https://agentskills.io/specification) and can execute Node.js commands.

## Features

- Accepts local images and HTTP(S) image URLs
- Supports JPEG, PNG, GIF, WebP, and BMP
- Supports plain-text and `--json` output
- Uses the fixed `mimo-v2.5-free` model with no API key, base URL, or model configuration
- Has no third-party runtime dependencies and requires Node.js 18 or newer

Fixed configuration:

```text
Model:    mimo-v2.5-free
Endpoint: https://opencode.ai/zen/v1/chat/completions
Auth:     none
```

## Installation

### Install it yourself (recommended)

Confirm that Node.js 18 or newer is installed, then run this command in a terminal:

```bash
npx --yes skills add 5258MF/agent-vision-skill --skill agent-vision -g -y --copy
```

`npx --yes` temporarily downloads and runs Skills CLI; this project itself is not published to npm, and the `agent-vision` files are downloaded from this GitHub repository. `-g` installs at user scope, `-y` skips Skills CLI confirmation prompts, and `--copy` avoids symbolic-link permission issues on Windows. Reopen the agent session or refresh its Skill index after installation.

### Ask an agent to install it

Paste the following message into an agent that can run terminal commands:

> Please install the `agent-vision` Skill for me:
> https://github.com/5258MF/agent-vision-skill
>
> First confirm that Node.js 18 or newer is available, then prefer this command:
> `npx --yes skills add 5258MF/agent-vision-skill --skill agent-vision -g -y --copy`
>
> After installation, verify that the current agent can discover `agent-vision`, report the actual installation path, and tell me whether I need to restart or open a new session. This Skill is fixed to OpenCode Zen's `mimo-v2.5-free`; do not ask me for an API key, base URL, or model name, and do not modify unrelated project files. If Skills CLI does not recognize the current framework, follow that framework's Skill documentation, copy `skills/agent-vision` into its user-level Skill directory, and verify the installation.

### Manual copy

If you do not want to use Skills CLI, download the repository and copy the complete `skills/agent-vision` directory into a Skill location supported by your framework. Keep the directory name as `agent-vision`. Common locations include:

```text
Generic project: <project>/.agents/skills/agent-vision/
Generic user:    ~/.agents/skills/agent-vision/
OpenCode project: <project>/.opencode/skills/agent-vision/
OpenCode user:    ~/.config/opencode/skills/agent-vision/
```

For other frameworks, use the directory documented by that framework's Agent Skills support. Confirm that the installed directory contains both `SKILL.md` and `scripts/vision.js`.

## Update, inspect, and remove

```bash
# Update the global installation
npx --yes skills update agent-vision -g -y

# List global Skills
npx --yes skills list -g

# Remove the global installation
npx --yes skills remove agent-vision -g -y
```

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
