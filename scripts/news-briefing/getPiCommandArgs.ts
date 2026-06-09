import type { RunPiArgs } from "./types.ts"

/** Build the non-interactive pi command args for briefing synthesis. */
export function getPiCommandArgs(
  /** The prompt and raw briefing path passed to pi. */
  args: RunPiArgs,
): string[] {
  return ["--provider", "anthropic", "-p", `@${args.rawBriefingPath}`, args.prompt]
}
