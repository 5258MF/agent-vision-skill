---
name: agent-vision
description: Use when the host says it cannot view an image or the current model does not support image input. Analyze pasted or clipboard images, image attachments, screenshots, rendered interfaces, charts, diagrams, photos, and reference images from accessible paths, URLs, or data URLs, including when visual inspection is needed implicitly for another task.
---

# Agent Vision

Use the bundled script to obtain textual evidence from images when the host cannot inspect them natively. The script uses the fixed OpenCode Zen endpoint and requires no API key, Base URL, model setting, or environment variable.

## Workflow

1. Locate the visual evidence needed for the task. If the host says it cannot view the image or the current model does not support image input, inspect any image attached to the current message, pasted from the clipboard, or supplied as a screenshot, chart, interface reference, local path, HTTP(S) URL, or `data:image/...;base64,...` URL. Prefer the attachment path or data URL exposed by the host. For a large data URL, pass it through stdin with `-` or save it as a temporary image file rather than putting it in a command argument. Do not query OpenCode SQLite databases or scan other sessions. If the host does not expose the attachment, ask the user to save or export it to an accessible local file or URL.
2. If the task depends on a rendered interface and the host can safely create and save a screenshot, capture it first. If no image source is accessible and no screenshot can be created, request one instead of guessing.
3. Resolve this Skill's directory from the loaded `SKILL.md`; do not assume the current working directory is the Skill directory.
4. For each image, run the script by absolute path, one image at a time to reduce free-endpoint rate limiting:

   ```text
   node "<skill-directory>/scripts/vision.js" "<image-path-or-url>" "<specific question>"
   ```

   For a large data URL supplied by the host, use stdin:

   ```text
   <data-url-source> | node "<skill-directory>/scripts/vision.js" - "<specific question>"
   ```

5. Keep each result associated with its source when processing multiple images.
6. Use the returned text as visual evidence. Answer in the user's language unless they request another language.

## Select the prompt

- Preserve the user's question when it is already specific.
- For general inspection, request visible text, subjects, layout, and uncertain details.
- For screenshots, request exact visible text and error messages before interpreting them.
- For charts and diagrams, request labels, values, relationships, trends, and ambiguity.
- For comparisons, inspect every image before drawing conclusions.

## Handle results safely

- Do not claim to have inspected an image unless the command completes successfully.
- If the script fails, report the concrete error and request another source or retry instead of guessing.
- The script retries temporary empty responses and transient service errors a limited number of times. Do not loop beyond the command's result; a 429 means the free endpoint should be tried later.
- Treat model output as fallible evidence, especially for small text, counts, and spatial details.
- Do not invent details absent from the script output.
- Images are sent to an external service. Before running the script, warn the user if the content appears private, confidential, credential-bearing, or identity-related.

The default command writes only the model's final text to stdout. Use `--json` when structured metadata is useful:

```text
node "<skill-directory>/scripts/vision.js" --json "<image>" "<question>"
```

The image argument may be a local path, an HTTP(S) URL, a valid `data:image/...;base64,...` URL, or `-` for a data URL read from stdin. The script validates supported image MIME types and keeps decoded image data within 10 MiB. It redacts data URLs in structured output.
