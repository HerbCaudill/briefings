import { readFileSync } from "node:fs"
import { join } from "node:path"

/** Read one versioned morning briefing prompt. */
export function readMorningBriefingPrompt(
  /** Prompt file name within the prompts directory. */
  fileName: string,
): string {
  return readFileSync(join(import.meta.dirname, "prompts", fileName), "utf8").trim()
}
