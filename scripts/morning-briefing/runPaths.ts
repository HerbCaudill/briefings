import { join } from "node:path"

import { formatRunId } from "./date.ts"

/** Build every private artifact path for one timestamped run. */
export function getMorningBriefingRunPaths(
  /** State root, target date, and run instant. */
  args: GetMorningBriefingRunPathsArgs,
): MorningBriefingRunPaths {
  const runId = formatRunId(args.now)
  const root = join(args.stateDirectoryPath, args.date, runId)

  return {
    carryoverPath: join(root, "carryover.md"),
    finalPath: join(root, "final.md"),
    gatherDirectoryPath: join(root, "gather"),
    manifestPath: join(root, "manifest.json"),
    mergedPath: join(root, "merged.json"),
    presentationEventsPath: join(root, "presentation.events.jsonl"),
    root,
    runId,
    synthesisDirectoryPath: join(root, "synthesis"),
  }
}

export type MorningBriefingRunPaths = {
  /** Carryover checklist from prior daily notes. */
  carryoverPath: string
  /** Canonical validated briefing Markdown. */
  finalPath: string
  /** Directory containing per-lane JSON and JSONL artifacts. */
  gatherDirectoryPath: string
  /** Run status and artifact index. */
  manifestPath: string
  /** Combined schema-checked gather results. */
  mergedPath: string
  /** Codex App Server presentation event log. */
  presentationEventsPath: string
  /** Unique private directory for this run. */
  root: string
  /** Filesystem-safe timestamp. */
  runId: string
  /** Directory containing synthesis output and events. */
  synthesisDirectoryPath: string
}

type GetMorningBriefingRunPathsArgs = {
  /** Target local date. */
  date: string
  /** Run instant used to produce a unique directory. */
  now: Date
  /** Private morning briefing state root. */
  stateDirectoryPath: string
}
