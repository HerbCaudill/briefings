import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

/** Build the carryover investigation artifact from the latest three prior briefings. */
export function buildCarryoverMarkdown(
  /** Daily-note directory and current Europe/Madrid date. */
  args: BuildCarryoverMarkdownArgs,
): string {
  const entries = readdirSync(args.dailyDirectoryPath)
    .filter(fileName => /^\d{4}-\d{2}-\d{2}\.md$/.test(fileName))
    .map(fileName => fileName.slice(0, -3))
    .filter(date => date < args.date)
    .sort((left, right) => right.localeCompare(left))
    .flatMap(date => {
      const note = readFileSync(join(args.dailyDirectoryPath, `${date}.md`), "utf8")
      const dailyBriefing = extractSection(note, "## Daily briefing", 2)
      if (!dailyBriefing) return []

      const openIssues = extractSection(dailyBriefing, "### Open issues", 3)
      const nextSteps = extractSection(dailyBriefing, "### Next steps", 3)
      if (!openIssues && !nextSteps) return []

      return [{ date, openIssues, nextSteps }]
    })
    .slice(0, 3)

  if (entries.length === 0)
    return "# Carryover checklist\n\nNo prior Daily briefing sections were found.\n"

  const sections = entries.map(
    entry =>
      `## ${entry.date}\n\n${[entry.openIssues, entry.nextSteps].filter(Boolean).join("\n\n")}\n`,
  )

  return `# Carryover checklist\n\n${sections.join("\n")}`
}

/** Extract one Markdown section through the next heading of the same or higher level. */
function extractSection(markdown: string, heading: string, level: number): string {
  const headingPattern = new RegExp(`^${escapeRegExp(heading)}[ \\t]*$`, "m")
  const headingMatch = headingPattern.exec(markdown)
  if (!headingMatch) return ""

  const sectionStart = headingMatch.index
  const followingTextStart = sectionStart + headingMatch[0].length
  const endPattern = new RegExp(`^#{1,${level}} [^\\n]+$`, "gm")
  endPattern.lastIndex = followingTextStart
  const endMatch = endPattern.exec(markdown)
  const sectionEnd = endMatch?.index ?? markdown.length

  return markdown.slice(sectionStart, sectionEnd).trim()
}

/** Escape a string for literal use in a regular expression. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

type BuildCarryoverMarkdownArgs = {
  /** Directory containing dated Markdown notes. */
  dailyDirectoryPath: string
  /** Current Europe/Madrid date, excluded from carryover. */
  date: string
}
