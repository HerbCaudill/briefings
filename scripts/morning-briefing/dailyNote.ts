import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { writeTextAtomically } from "./atomicWrite.ts"

const DAILY_BRIEFING_HEADING_PATTERN = /^## Daily briefing[ \t]*$/m
const TOP_LEVEL_SECTION_PATTERN = /^#{1,2} [^\n]+$/gm

/** Insert or replace the Daily briefing section without changing unrelated note content. */
export function upsertDailyBriefing(
  /** Existing daily note contents. */
  note: string,
  /** Complete Daily briefing section. */
  briefing: string,
): string {
  const headingMatch = DAILY_BRIEFING_HEADING_PATTERN.exec(note)
  if (!headingMatch) return appendBriefing(note, briefing)

  TOP_LEVEL_SECTION_PATTERN.lastIndex = headingMatch.index + headingMatch[0].length
  const nextSectionMatch = TOP_LEVEL_SECTION_PATTERN.exec(note)
  const sectionEnd = nextSectionMatch?.index ?? note.length
  const suffix = note.slice(sectionEnd)
  const separator = suffix ? "\n" : ""

  return `${note.slice(0, headingMatch.index)}${briefing.trimEnd()}\n${separator}${suffix}`
}

/** Write and verify today's Daily briefing section. */
export function publishDailyBriefingToNote(
  /** Daily notes directory. */
  dailyDirectoryPath: string,
  /** Target local date. */
  date: string,
  /** Validated Daily briefing Markdown. */
  briefing: string,
): string {
  const notePath = join(dailyDirectoryPath, `${date}.md`)
  const existingNote = existsSync(notePath) ? readFileSync(notePath, "utf8") : ""
  const updatedNote = upsertDailyBriefing(existingNote, briefing)
  writeTextAtomically(notePath, updatedNote)

  const savedNote = readFileSync(notePath, "utf8")
  if (savedNote !== updatedNote || !savedNote.includes(briefing.trimEnd()))
    throw new Error(`Daily briefing verification failed for ${notePath}`)

  return notePath
}

/** Append a briefing with one blank line after existing note content. */
function appendBriefing(note: string, briefing: string): string {
  if (!note) return briefing
  const separator = note.endsWith("\n\n") ? "" : note.endsWith("\n") ? "\n" : "\n\n"
  return `${note}${separator}${briefing}`
}
