/** One source's coverage status from a gather agent. */
export type MorningBriefingSourceCoverage = {
  /** Compact diagnostic detail, empty when the source was covered. */
  readonly detail: string
  /** Source name shown in the final checklist. */
  readonly source: string
  /** Whether the required source review completed. */
  readonly status: "covered" | "incomplete"
}

/** Schema-constrained result from one gather agent. */
export type MorningBriefingGatherResult = {
  /** Coverage record for every source assigned to this lane. */
  readonly coverage: readonly MorningBriefingSourceCoverage[]
  /** Stable lane key. */
  readonly lane: string
  /** Compact Markdown facts and source links for synthesis. */
  readonly report: string
}

/** Static definition of one parallel source lane. */
export type MorningBriefingLane = {
  /** Stable lane key. */
  key: string
  /** Standalone prompt file name. */
  promptFileName: string
  /** Exact source names assigned to the lane. */
  sources: readonly string[]
}

/** Schema-constrained result from the final synthesis agent. */
export type MorningBriefingSynthesisResult = {
  /** Briefing content before the deterministic New tasks section is added. */
  readonly markdown: string
  /** Actions that are absent from both incomplete and completed Tasks. */
  readonly newTasks: readonly MorningBriefingTaskDraft[]
}

/** A task selected by synthesis for creation in the Inbox list. */
export type MorningBriefingTaskDraft = {
  /** Source context and links that make the task actionable. */
  readonly notes: string
  /** Short action-oriented task title. */
  readonly title: string
}

/** Tasks created by one run, and drafts deferred after Tasks failed. */
export type MorningBriefingTaskOutcome = {
  /** Tasks successfully created in Inbox. */
  readonly created: readonly CreatedMorningBriefingTask[]
  /** Drafts not confirmed in Tasks; a rerun for the same date resumes them. */
  readonly deferred: readonly MorningBriefingTaskDraft[]
  /** Why task creation stopped, when it did. */
  readonly error?: string
}

/** A task successfully created in Tasks. */
export type CreatedMorningBriefingTask = MorningBriefingTaskDraft & {
  /** Browser URL for the created task. */
  readonly url: string
}
