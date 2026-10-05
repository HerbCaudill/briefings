import { readFileSync } from "node:fs"

import { MORNING_BRIEFING_CONTEXT_PATH } from "./constants.ts"

/** Read Herb's standing morning briefing guidance from Obsidian. */
export function readMorningBriefingContext(
  /** Alternate path used by focused tests. */
  contextPath = MORNING_BRIEFING_CONTEXT_PATH,
): string {
  return readFileSync(contextPath, "utf8").trim()
}
