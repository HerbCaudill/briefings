import { execFile } from "node:child_process"
import { promisify } from "node:util"
import type { RunPiArgs } from "./types.ts"

const execFileAsync = promisify(execFile)

/** Run pi against a raw briefing file with the provided prompt. */
export async function runPiWithRawBriefing(
  /** The prompt and raw briefing path. */
  args: RunPiArgs,
): Promise<string> {
  const { stdout } = await execFileAsync("pi", ["-p", `@${args.rawBriefingPath}`, args.prompt])
  return stdout
}
