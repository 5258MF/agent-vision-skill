---
name: agent-vision
description: Analyze local or remote images with the bundled MiMo image-analysis helper and return textual visual evidence. Use proactively whenever completing a task requires inspecting screenshots, rendered interfaces, charts, diagrams, photos, image attachments, or other visual evidence, even when the user does not explicitly request image analysis, including for description, comparison, classification, OCR, and visual question answering, especially when the current agent lacks native vision.
---

# Agent Vision

Use the bundled script to obtain textual evidence from images. The script calls the fixed OpenCode Zen `mimo-v2.5-free` endpoint and requires no API key.

## Workflow

1. Locate the visual evidence needed for the task. Collect relevant local image paths or HTTP(S) image URLs from the user request, attachment metadata, and task context. If the task depends on a rendered interface and the host can safely save a screenshot, capture it first. If no image source is accessible and no screenshot can be created, request one instead of guessing.
2. Resolve this Skill's directory from the loaded `SKILL.md`; do not assume the current working directory is the Skill directory.
3. For each image, run the script by absolute path:

   ```text
   node "<skill-directory>/scripts/vision.js" "<image-path-or-url>" "<specific question>"
   ```

4. Keep each result associated with its source when processing multiple images.
5. Use the returned text as visual evidence. Answer in the user's language unless they request another language.

## Select the prompt

- Preserve the user's question when it is already specific.
- For general inspection, request visible text, subjects, layout, and uncertain details.
- For screenshots, request exact visible text and error messages before interpreting them.
- For charts and diagrams, request labels, values, relationships, trends, and ambiguity.
- For comparisons, inspect every image before drawing conclusions.

## Handle results safely

- Do not claim to have inspected an image unless the command completes successfully.
- If the script fails, report the concrete error and request another source or retry instead of guessing.
- Treat model output as fallible evidence, especially for small text, counts, and spatial details.
- Do not invent details absent from the script output.
- Images are sent to an external service. Before running the script, warn the user if the content appears private, confidential, credential-bearing, or identity-related.

The default command writes only the model's final text to stdout. Use `--json` when structured metadata is useful:

```text
node "<skill-directory>/scripts/vision.js" --json "<image>" "<question>"
```
