import { homedir } from "node:os"
import { join, resolve } from "node:path"

/** Absolute path to this repository. */
export const BRIEFINGS_REPOSITORY_PATH = resolve(import.meta.dirname, "../..")

/** Absolute path to the Codex executable used by scheduled runs. */
export const CODEX_COMMAND_PATH = join(homedir(), "Library/pnpm/bin/codex")

/** Directory containing Herb's Obsidian daily notes. */
export const DAILY_NOTES_DIRECTORY_PATH = join(homedir(), "Code/herbcaudill/notes/daily")

/** Private state directory for persisted morning briefing artifacts. */
export const MORNING_BRIEFING_STATE_DIRECTORY_PATH = join(
  homedir(),
  ".local/state/morning-briefing",
)

/** Model used for source gathering and final synthesis. */
export const MORNING_BRIEFING_MODEL = "gpt-5.6-sol"

/** Independent source groups gathered in parallel. */
export const MORNING_BRIEFING_LANES = [
  {
    key: "schedule",
    promptFileName: "schedule.prompt.md",
    sources: [
      "Primary calendar",
      "Lynne's calendar",
      "DevResults calendar",
      "Family and Tamariu calendars",
      "Google Tasks",
    ],
  },
  {
    key: "communications",
    promptFileName: "communications.prompt.md",
    sources: [
      "Gmail",
      "Slack",
      "WhatsApp",
      "Signal",
      "Apple Messages",
      "Facebook Messenger",
      "LinkedIn",
    ],
  },
  {
    key: "work",
    promptFileName: "work.prompt.md",
    sources: ["GitHub", "Meeting transcripts", "Local agent sessions"],
  },
] as const

/** Required section headings in the final briefing, in display order. */
export const REQUIRED_BRIEFING_HEADINGS = [
  "### Sources",
  "### Calendar",
  "### Other calendars",
  "### Open issues",
  "### Yesterday",
  "### Proposed standup",
  "### New tasks",
] as const

/** Headings written by synthesis before task creation determines the final section. */
export const SYNTHESIZED_BRIEFING_HEADINGS = REQUIRED_BRIEFING_HEADINGS.slice(0, -1)
