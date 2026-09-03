import { MORNING_BRIEFING_LANES, REQUIRED_BRIEFING_HEADINGS } from "./constants.ts"

/** Validate the canonical final briefing before either publication step. */
export function validateFinalBriefingMarkdown(
  /** Candidate briefing Markdown. */
  markdown: string,
): string {
  if (!markdown.startsWith("## Daily briefing\n"))
    throw new Error("The final briefing must begin with `## Daily briefing`")

  let previousIndex = -1
  for (const heading of REQUIRED_BRIEFING_HEADINGS) {
    const headingIndex = markdown.indexOf(`\n${heading}\n`)
    if (headingIndex < 0) throw new Error(`The final briefing is missing ${heading}`)
    if (headingIndex <= previousIndex)
      throw new Error(`The final briefing has ${heading} out of order`)
    previousIndex = headingIndex
  }

  if (markdown.match(/^## Daily briefing[ \t]*$/gm)?.length !== 1)
    throw new Error("The final briefing must contain one Daily briefing section")

  for (const source of MORNING_BRIEFING_LANES.flatMap(lane => lane.sources)) {
    const checklistPattern = new RegExp(
      `^- \\[([x ])\\] ${escapeRegExp(source)}(?: \\([^\\n]+\\))?$`,
      "gm",
    )
    const matches = markdown.match(checklistPattern) ?? []
    if (matches.length !== 1)
      throw new Error(`The final briefing must contain one coverage entry for ${source}`)
  }

  if (!markdown.includes("```text\n✅ *Yesterday*\n") || !markdown.includes("\n🎯 *Today*\n"))
    throw new Error("The final briefing must contain the copy-ready standup block")

  return `${markdown.trimEnd()}\n`
}

/** Escape a source name for literal use in a regular expression. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
