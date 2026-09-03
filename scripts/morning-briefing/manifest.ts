import { writeTextAtomically } from "./atomicWrite.ts"

/** Create the mutable in-memory manifest for one run. */
export function createMorningBriefingManifest(
  /** Date and run identifier. */
  args: CreateMorningBriefingManifestArgs,
): MorningBriefingManifest {
  return {
    date: args.date,
    runId: args.runId,
    startedAt: args.startedAt,
    stages: {},
    status: "running",
  }
}

/** Update one stage and atomically persist the full manifest. */
export function updateMorningBriefingManifest(
  /** Manifest path, object, and stage update. */
  args: UpdateMorningBriefingManifestArgs,
): void {
  args.manifest.stages[args.stage] = {
    ...args.manifest.stages[args.stage],
    ...args.update,
  }
  writeTextAtomically(args.path, `${JSON.stringify(args.manifest, null, 2)}\n`)
}

/** Mark the whole run complete or failed and persist it. */
export function finishMorningBriefingManifest(
  /** Manifest path, object, and final status. */
  args: FinishMorningBriefingManifestArgs,
): void {
  args.manifest.finishedAt = args.finishedAt
  args.manifest.status = args.status
  if (args.error) args.manifest.error = args.error
  writeTextAtomically(args.path, `${JSON.stringify(args.manifest, null, 2)}\n`)
}

export type MorningBriefingManifest = {
  /** Target local date. */
  date: string
  /** Compact failure when the whole run did not finish. */
  error?: string
  /** ISO timestamp when the run stopped. */
  finishedAt?: string
  /** Unique run identifier. */
  runId: string
  /** ISO timestamp when the run started. */
  startedAt: string
  /** Per-stage status and artifacts. */
  stages: Record<string, MorningBriefingManifestStage>
  /** Whole-run status. */
  status: "running" | "complete" | "failed"
}

type MorningBriefingManifestStage = {
  /** Paths produced by the stage. */
  artifacts?: string[]
  /** Compact failure for a failed stage. */
  error?: string
  /** ISO timestamp when the stage finished. */
  finishedAt?: string
  /** ISO timestamp when the stage started. */
  startedAt?: string
  /** Stage status. */
  status?: "running" | "complete" | "failed"
}

type CreateMorningBriefingManifestArgs = {
  /** Target date. */
  date: string
  /** Unique run identifier. */
  runId: string
  /** Run start timestamp. */
  startedAt: string
}

type UpdateMorningBriefingManifestArgs = {
  /** Mutable manifest object. */
  manifest: MorningBriefingManifest
  /** Manifest output path. */
  path: string
  /** Stage key. */
  stage: string
  /** Partial stage update. */
  update: MorningBriefingManifestStage
}

type FinishMorningBriefingManifestArgs = {
  /** Compact whole-run failure. */
  error?: string
  /** Run finish timestamp. */
  finishedAt: string
  /** Mutable manifest object. */
  manifest: MorningBriefingManifest
  /** Manifest output path. */
  path: string
  /** Whole-run final status. */
  status: "complete" | "failed"
}
