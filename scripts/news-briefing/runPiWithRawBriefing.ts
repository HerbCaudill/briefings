import { runProcessWithForwardedOutput } from "./runProcessWithForwardedOutput.ts"
import type { RunPiArgs } from "./types.ts"

/** Run pi against a raw briefing file with the provided prompt. */
export async function runPiWithRawBriefing(
  /** The prompt and raw briefing path. */
  args: RunPiArgs,
): Promise<string> {
  return await runProcessWithForwardedOutput(
    "pi",
    ["-p", `@${args.rawBriefingPath}`, args.prompt],
    {
      forwardStdout: false,
    },
  )
}
