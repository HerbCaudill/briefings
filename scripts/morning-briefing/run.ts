#!/usr/bin/env -S node --experimental-strip-types

import { mkdirSync } from "node:fs"
import { join } from "node:path"

import { MORNING_BRIEFING_STATE_DIRECTORY_PATH } from "./constants.ts"
import { formatMadridDate } from "./date.ts"
import { describeMorningBriefingDryRun, runLiveMorningBriefing } from "./liveRuntime.ts"
import { acquireMorningBriefingRunLock } from "./runLock.ts"

/** Parse CLI arguments and run or describe the morning briefing pipeline. */
async function main(): Promise<void> {
  const arguments_ = process.argv.slice(2)
  const dryRun = arguments_.includes("--dry-run")
  const dateArgument = arguments_.find(argument => !argument.startsWith("--"))
  const date = dateArgument ?? formatMadridDate()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error(`Expected a YYYY-MM-DD date, received ${date}`)

  if (dryRun) {
    process.stdout.write(`${JSON.stringify(describeMorningBriefingDryRun({ date }), null, 2)}\n`)
    return
  }

  mkdirSync(MORNING_BRIEFING_STATE_DIRECTORY_PATH, { recursive: true })
  const releaseLock = acquireMorningBriefingRunLock(
    join(MORNING_BRIEFING_STATE_DIRECTORY_PATH, "run.lock"),
  )

  try {
    const briefing = await runLiveMorningBriefing({ date })
    process.stdout.write(briefing)
  } finally {
    releaseLock()
  }
}

await main().catch(error => {
  console.error(`[morning-briefing] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
