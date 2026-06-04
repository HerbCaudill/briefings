import { readFileSync } from "node:fs"
import path from "node:path"

/** Read a markdown prompt file from the news briefing prompts directory. */
export function readPromptFile(
  /** The markdown prompt file name. */
  fileName: string,
): string {
  return readFileSync(path.join(import.meta.dirname, "prompts", fileName), "utf8").trim()
}
