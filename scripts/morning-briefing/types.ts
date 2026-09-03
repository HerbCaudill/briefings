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
  /** Complete briefing beginning with the level-two Daily briefing heading. */
  readonly markdown: string
}
