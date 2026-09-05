import { Schema } from "effect"

/** Coverage entry returned by a gather agent. */
export const MorningBriefingSourceCoverageSchema = Schema.Struct({
  detail: Schema.String,
  source: Schema.String,
  status: Schema.Literal("covered", "incomplete"),
})

/** Result returned by one gather agent. */
export const MorningBriefingGatherResultSchema = Schema.Struct({
  coverage: Schema.Array(MorningBriefingSourceCoverageSchema),
  lane: Schema.String,
  report: Schema.String,
})

/** Result returned by the synthesis agent. */
export const MorningBriefingSynthesisResultSchema = Schema.Struct({
  markdown: Schema.String,
  newTasks: Schema.Array(
    Schema.Struct({
      notes: Schema.String,
      title: Schema.String,
    }),
  ),
})
