import type { RunNewsBriefingPipelineArgs } from "./types.ts"

/** Run the fetch stage for one date, then synthesize every missing final briefing. */
export async function runNewsBriefingPipeline(
  /** The pipeline dependencies and target date. */
  args: RunNewsBriefingPipelineArgs,
): Promise<void> {
  args.log?.(`Fetching raw briefing for ${args.date}...`)
  const rawBriefing = await args.runFetchStage(args.date)
  args.log?.(`Fetched raw briefing for ${args.date} with ${rawBriefing.articles.length} articles.`)

  const missingBriefingDates = args.listMissingBriefingDates()
  args.log?.(`Found ${missingBriefingDates.length} missing final briefings.`)

  for (const date of missingBriefingDates) {
    args.log?.(`Synthesizing final briefing for ${date}...`)
    const briefingPath = await args.runSynthesisStage(date)
    args.log?.(`Wrote final briefing to ${briefingPath}.`)
  }

  args.log?.("News briefing pipeline complete.")
}
