import type { MorningBriefingGatherResult, MorningBriefingLane } from "./types.ts"

/** Gather independent source lanes, synthesize once, then publish the same briefing twice. */
export async function runMorningBriefingPipeline(
  /** Injected stages for one morning briefing run. */
  args: RunMorningBriefingPipelineArgs,
): Promise<string> {
  await args.prepare()
  const settledGatherResults = await Promise.allSettled(
    args.lanes.map(lane => args.gatherLane(lane)),
  )
  const gatherResults = settledGatherResults.map(result => {
    if (result.status === "rejected") throw result.reason
    return result.value
  })
  const markdown = await args.synthesize(gatherResults)
  await args.publishDailyNote(markdown)
  await args.presentInCodex(markdown)
  return markdown
}

export type RunMorningBriefingPipelineArgs = {
  /** Gather one independent source lane. */
  gatherLane: (lane: MorningBriefingLane) => Promise<MorningBriefingGatherResult>
  /** Source lanes to gather concurrently. */
  lanes: readonly MorningBriefingLane[]
  /** Prepare the carryover and run directory before gathering. */
  prepare: () => Promise<void>
  /** Present the saved briefing in a clean pinned Codex task. */
  presentInCodex: (markdown: string) => Promise<void>
  /** Save and verify the Daily briefing section in Obsidian. */
  publishDailyNote: (markdown: string) => Promise<void>
  /** Synthesize one canonical briefing from every gather artifact. */
  synthesize: (gatherResults: MorningBriefingGatherResult[]) => Promise<string>
}
