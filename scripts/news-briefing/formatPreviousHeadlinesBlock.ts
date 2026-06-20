/**
 * Format the previous day's headlines as a prompt block that tells the model
 * which stories were already covered. Returns an empty string when there are no
 * previous headlines so the selection prompt is left unchanged.
 */
export function formatPreviousHeadlinesBlock(
  /** Headlines from the previous day's final briefing. */
  previousHeadlines: string[],
): string {
  if (previousHeadlines.length === 0) return ""

  const headlineList = previousHeadlines.map(headline => `- ${headline}`).join("\n")

  return `\n\nThese stories were already covered in yesterday's briefing. Do not select a story that merely repeats one of them; only revisit a topic when there is a significant new development, and frame it around what is new:\n${headlineList}`
}
