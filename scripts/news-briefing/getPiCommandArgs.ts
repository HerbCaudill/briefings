import type { RunPiArgs } from "./types.ts"

/** Build the non-interactive pi command args for briefing synthesis. */
export function getPiCommandArgs(
  /** The prompt and raw briefing path passed to pi. */
  args: RunPiArgs,
): string[] {
  return [
    "--provider",
    "openai",
    "--model",
    "gpt-5.6-terra",
    "-p",
    `@${args.rawBriefingPath}`,
    args.prompt,
  ]
}
