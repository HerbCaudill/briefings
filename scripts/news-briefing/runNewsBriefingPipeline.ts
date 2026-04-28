import type { RunNewsBriefingPipelineArgs } from "./types.ts"

/** Run the fetch stage for one date, then synthesize every missing final briefing. */
export async function runNewsBriefingPipeline(
  /** The pipeline dependencies and target date. */
  args: RunNewsBriefingPipelineArgs,
): Promise<void> {
  await args.runFetchStage(args.date)

  for (const date of args.listMissingBriefingDates()) {
    await args.runSynthesisStage(date)
  }
}
