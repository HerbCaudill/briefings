import { formatElapsedSeconds } from "./formatElapsedSeconds.ts"
import type { RunNewsBriefingPipelineArgs } from "./types.ts"

/** Run the fetch stage for one date, then synthesize every missing final briefing. */
export async function runNewsBriefingPipeline(
  /** The pipeline dependencies and target date. */
  args: RunNewsBriefingPipelineArgs,
): Promise<void> {
  const now = args.now ?? Date.now
  const pipelineStart = now()

  args.log?.(`Clearing existing briefing files for ${args.date}...`)
  const clearStart = now()
  await args.clearExistingBriefingFiles(args.date)
  args.log?.(`done (${formatElapsedSeconds(now() - clearStart)})`)
  args.log?.("")

  args.log?.("Fetching candidates...")
  args.log?.("")
  const fetchStart = now()
  const rawBriefing = await args.runFetchStage(args.date)
  args.log?.("-------------------------")
  args.log?.(`Total candidates      ${rawBriefing.articles.length}`)
  args.log?.("")
  args.log?.(`done (${formatElapsedSeconds(now() - fetchStart)})`)
  args.log?.("")

  const missingBriefingDates = args.listMissingBriefingDates()
  const generatedBriefingDates: string[] = []

  for (const date of missingBriefingDates) {
    await args.runSynthesisStage(date)
    generatedBriefingDates.push(date)
  }

  if (generatedBriefingDates.length > 0) {
    await args.commitAndPushGeneratedBriefings(generatedBriefingDates)
  }

  args.log?.(`Briefing complete (${formatElapsedSeconds(now() - pipelineStart)})`)
}
