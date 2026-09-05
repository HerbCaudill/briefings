import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { runInboxIntake } from "../inbox/runInboxIntake.ts"
import { startInboxResearch } from "../inbox/startInboxResearch.ts"

import { writeTextAtomically } from "./atomicWrite.ts"
import { buildCarryoverMarkdown } from "./carryover.ts"
import {
  BRIEFINGS_REPOSITORY_PATH,
  CODEX_COMMAND_PATH,
  DAILY_NOTES_DIRECTORY_PATH,
  MORNING_BRIEFING_LANES,
  MORNING_BRIEFING_MODEL,
  MORNING_BRIEFING_STATE_DIRECTORY_PATH,
} from "./constants.ts"
import { presentMorningBriefingInCodex } from "./codexPresentation.ts"
import { publishDailyBriefingToNote } from "./dailyNote.ts"
import { gatherMorningBriefingLane } from "./gatherMorningBriefingLane.ts"
import { createInboxTasks } from "./createInboxTasks.ts"
import { finalizeMorningBriefing } from "./finalizeBriefing.ts"
import {
  createMorningBriefingManifest,
  finishMorningBriefingManifest,
  updateMorningBriefingManifest,
} from "./manifest.ts"
import { syncMorningBriefingToObsidian } from "./obsidian.ts"
import { getMorningBriefingRunPaths } from "./runPaths.ts"
import { runMorningBriefingPipeline } from "./runMorningBriefingPipeline.ts"
import { synthesizeMorningBriefing } from "./synthesizeMorningBriefing.ts"

/** Run the repository-owned morning briefing workflow. */
export async function runLiveMorningBriefing(
  /** Target date and optional live dependency overrides. */
  args: RunLiveMorningBriefingArgs,
): Promise<string> {
  const now = args.now ?? new Date()
  const stateDirectoryPath = args.stateDirectoryPath ?? MORNING_BRIEFING_STATE_DIRECTORY_PATH
  const dailyNotesDirectoryPath = args.dailyNotesDirectoryPath ?? DAILY_NOTES_DIRECTORY_PATH
  const codexCommand = args.codexCommand ?? CODEX_COMMAND_PATH
  const cwd = args.cwd ?? BRIEFINGS_REPOSITORY_PATH
  const paths = getMorningBriefingRunPaths({ date: args.date, now, stateDirectoryPath })
  const manifest = createMorningBriefingManifest({
    date: args.date,
    runId: paths.runId,
    startedAt: now.toISOString(),
  })
  const environment = {
    ...process.env,
    CODEX_INTERNAL_ORIGINATOR_OVERRIDE: "Codex Desktop",
  }
  const gatherSchemaPath = join(import.meta.dirname, "schemas/gather-result.schema.json")
  const synthesisSchemaPath = join(import.meta.dirname, "schemas/synthesis-result.schema.json")
  let dailyNotePath = ""

  mkdirSync(paths.root, { mode: 0o700, recursive: true })

  try {
    const markdown = await runMorningBriefingPipeline({
      processInbox: () =>
        runStage("inbox-intake", [], async () => {
          try {
            await runInboxIntake()
          } finally {
            await startInboxResearch()
          }
        }),
      createTasks: tasks =>
        runStage("google-tasks", [paths.newTasksPath], async () => {
          const createdTasks = await createInboxTasks({ tasks })
          writeTextAtomically(paths.newTasksPath, `${JSON.stringify(createdTasks, null, 2)}\n`)
          return createdTasks
        }),
      finalize: (briefing, tasks) =>
        runStage("finalize", [paths.finalPath], async () => {
          const finalBriefing = finalizeMorningBriefing(briefing, tasks)
          writeTextAtomically(paths.finalPath, finalBriefing)
          return finalBriefing
        }),
      gatherLane: lane =>
        runStage(`gather:${lane.key}`, [join(paths.gatherDirectoryPath, `${lane.key}.json`)], () =>
          gatherMorningBriefingLane({
            carryoverPath: paths.carryoverPath,
            codexCommand,
            cwd,
            date: args.date,
            environment,
            gatherDirectoryPath: paths.gatherDirectoryPath,
            lane,
            model: MORNING_BRIEFING_MODEL,
            schemaPath: gatherSchemaPath,
            timeZone: args.timeZone,
          }),
        ),
      lanes: MORNING_BRIEFING_LANES,
      prepare: () =>
        runStage("carryover", [paths.carryoverPath], async () => {
          const carryover = buildCarryoverMarkdown({
            dailyDirectoryPath: dailyNotesDirectoryPath,
            date: args.date,
          })
          writeTextAtomically(paths.carryoverPath, carryover)
        }),
      presentInCodex: briefing =>
        runStage("codex-presentation", [paths.presentationEventsPath], () =>
          presentMorningBriefingInCodex({
            briefing,
            codexCommand,
            dailyNotePath,
            date: args.date,
            eventsPath: paths.presentationEventsPath,
          }),
        ),
      publishDailyNote: briefing =>
        runStage("obsidian", [join(dailyNotesDirectoryPath, `${args.date}.md`)], async () => {
          dailyNotePath = publishDailyBriefingToNote(dailyNotesDirectoryPath, args.date, briefing)
          await syncMorningBriefingToObsidian()
        }),
      synthesize: gatherResults =>
        runStage("synthesis", [paths.mergedPath], () =>
          synthesizeMorningBriefing({
            carryoverPath: paths.carryoverPath,
            codexCommand,
            cwd,
            date: args.date,
            environment,
            gatherResults,
            mergedPath: paths.mergedPath,
            model: MORNING_BRIEFING_MODEL,
            schemaPath: synthesisSchemaPath,
            synthesisDirectoryPath: paths.synthesisDirectoryPath,
            timeZone: args.timeZone,
          }),
        ),
    })

    finishMorningBriefingManifest({
      finishedAt: timestamp(),
      manifest,
      path: paths.manifestPath,
      status: "complete",
    })
    return markdown
  } catch (error) {
    finishMorningBriefingManifest({
      error: compactError(error),
      finishedAt: timestamp(),
      manifest,
      path: paths.manifestPath,
      status: "failed",
    })
    throw error
  }

  /** Persist one stage transition. */
  function updateStage(
    stage: string,
    update: Parameters<typeof updateMorningBriefingManifest>[0]["update"],
  ): void {
    updateMorningBriefingManifest({ manifest, path: paths.manifestPath, stage, update })
  }

  /** Run one stage and persist both successful and failed transitions. */
  async function runStage<Result>(
    stage: string,
    artifacts: string[],
    action: () => Promise<Result>,
  ): Promise<Result> {
    updateStage(stage, { artifacts, startedAt: timestamp(), status: "running" })
    try {
      const result = await action()
      updateStage(stage, { finishedAt: timestamp(), status: "complete" })
      return result
    } catch (error) {
      updateStage(stage, {
        error: compactError(error),
        finishedAt: timestamp(),
        status: "failed",
      })
      throw error
    }
  }
}

/** Describe a run without contacting sources or changing either destination. */
export function describeMorningBriefingDryRun(
  /** Target date and optional path overrides. */
  args: RunLiveMorningBriefingArgs,
) {
  const now = args.now ?? new Date()
  const paths = getMorningBriefingRunPaths({
    date: args.date,
    now,
    stateDirectoryPath: args.stateDirectoryPath ?? MORNING_BRIEFING_STATE_DIRECTORY_PATH,
  })

  return {
    date: args.date,
    destinations: {
      codex: "A new dated task in the Pinned sidebar section",
      obsidian: join(args.dailyNotesDirectoryPath ?? DAILY_NOTES_DIRECTORY_PATH, `${args.date}.md`),
    },
    lanes: MORNING_BRIEFING_LANES.map(lane => ({ key: lane.key, sources: lane.sources })),
    paths,
    timeZone: args.timeZone,
  }
}

/** Compact a failure for the private run manifest. */
function compactError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error))
    .replaceAll(/\s+/g, " ")
    .slice(0, 1_000)
}

/** Get a fresh ISO timestamp for a stage transition. */
function timestamp(): string {
  return new Date().toISOString()
}

export type RunLiveMorningBriefingArgs = {
  /** Optional Codex executable path. */
  codexCommand?: string
  /** Optional repository working path. */
  cwd?: string
  /** Optional daily-note directory. */
  dailyNotesDirectoryPath?: string
  /** Target local date. */
  date: string
  /** Optional run instant. */
  now?: Date
  /** Optional private state directory. */
  stateDirectoryPath?: string
  /** IANA time zone used to interpret the target date. */
  timeZone: string
}
