import type {
  CreatedMorningBriefingTask,
  MorningBriefingGatherResult,
  MorningBriefingLane,
  MorningBriefingSynthesisResult,
  MorningBriefingTaskDraft,
} from "./types.ts"

/** Gather independent source lanes, synthesize once, then publish the same briefing twice. */
export async function runMorningBriefingPipeline(
  /** Injected stages for one morning briefing run. */
  args: RunMorningBriefingPipelineArgs,
): Promise<string> {
  await args.processInbox()
  await args.prepare()
  const settledGatherResults = await Promise.allSettled(
    args.lanes.map(lane => args.gatherLane(lane)),
  )
  const gatherResults = settledGatherResults.map(result => {
    if (result.status === "rejected") throw result.reason
    return result.value
  })
  const synthesis = await args.synthesize(gatherResults)
  const createdTasks = await args.createTasks(synthesis.newTasks)
  const markdown = await args.finalize(synthesis.markdown, createdTasks)
  await args.publishDailyNote(markdown)
  await args.presentInCodex(markdown)
  return markdown
}

export type RunMorningBriefingPipelineArgs = {
  /** Transfer new captures before gathering the current task lists. */
  processInbox: () => Promise<void>
  /** Create deduplicated actions in the Google Tasks Inbox list. */
  createTasks: (tasks: readonly MorningBriefingTaskDraft[]) => Promise<CreatedMorningBriefingTask[]>
  /** Add the task-creation outcome as the briefing's final section. */
  finalize: (markdown: string, tasks: readonly CreatedMorningBriefingTask[]) => Promise<string>
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
  synthesize: (
    gatherResults: MorningBriefingGatherResult[],
  ) => Promise<MorningBriefingSynthesisResult>
}
