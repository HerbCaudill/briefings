import type { CreatedMorningBriefingTask } from "./types.ts"
import { validateFinalBriefingMarkdown } from "./validateBriefing.ts"

/** Add the final section describing tasks that were actually created. */
export function finalizeMorningBriefing(
  /** Validated synthesis Markdown. */
  markdown: string,
  /** Tasks successfully created in Inbox. */
  tasks: readonly CreatedMorningBriefingTask[],
): string {
  const items = tasks.length
    ? tasks.map(task => `- [${escapeLinkLabel(task.title)}](${task.url})`).join("\n")
    : "- None."
  return validateFinalBriefingMarkdown(`${markdown.trimEnd()}\n\n### New tasks\n\n${items}\n`)
}

/** Escape Markdown syntax that can terminate a link label. */
function escapeLinkLabel(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]")
}
