import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { SELECTION_PROMPT, SYNTHESIS_PROMPT } from "./constants.ts"
import { formatElapsedSeconds } from "./formatElapsedSeconds.ts"
import { hydrateSelectedStories } from "./hydrateSelectedStories.ts"
import { parseJsonObject } from "./parseJsonObject.ts"
import type { BriefingSelection, RawBriefing, SynthesizeBriefingArgs } from "./types.ts"

/** Run pi in selection and synthesis stages, then write the final briefing JSON. */
export async function synthesizeBriefing(
  /** The synthesis-stage configuration and pi runner dependency. */
  args: SynthesizeBriefingArgs,
): Promise<string> {
  const now = args.now ?? Date.now
  const rawBriefingPath = path.join(args.rawDirectoryPath, `${args.date}.json`)
  const briefingPath = path.join(args.briefingDirectoryPath, `${args.date}.json`)
  const selectionPath = path.join(args.rawDirectoryPath, `${args.date}-selection.json`)

  if (!existsSync(rawBriefingPath)) {
    throw new Error(`Missing raw briefing file: ${rawBriefingPath}`)
  }

  const rawBriefing = parseJsonObject<RawBriefing>(readFileSync(rawBriefingPath, "utf8"))

  args.log?.("Selecting stories...")
  const selectionStart = now()
  const selectionPrompt = `${SELECTION_PROMPT}\n\nRaw briefing date: ${args.date}`
  const selectionOutput = await args.runPi({
    prompt: selectionPrompt,
    rawBriefingPath,
  })
  writeFileSync(selectionPath, `${selectionOutput.trim()}\n`)
  args.log?.(`done (${formatElapsedSeconds(now() - selectionStart)})`)
  args.log?.("")

  args.log?.("Fetching sources...")
  args.log?.("")
  const fetchSourcesStart = now()
  const selection = parseJsonObject<BriefingSelection>(selectionOutput)
  const hydratedSelection = await hydrateSelectedStories(
    rawBriefing,
    selection,
    args.fetchPageHtml,
    args.log,
  )
  writeFileSync(selectionPath, JSON.stringify(hydratedSelection, null, 2) + "\n")
  args.log?.("")
  args.log?.(`done (${formatElapsedSeconds(now() - fetchSourcesStart)})`)
  args.log?.("")

  args.log?.("Writing briefing...")
  const writingStart = now()
  const synthesisPrompt = `${SYNTHESIS_PROMPT}\n\nRaw briefing date: ${args.date}`
  const synthesis = await args.runPi({
    prompt: synthesisPrompt,
    rawBriefingPath: selectionPath,
  })

  mkdirSync(args.briefingDirectoryPath, { recursive: true })
  writeFileSync(briefingPath, `${synthesis.trim()}\n`)
  args.log?.(`done (${formatElapsedSeconds(now() - writingStart)})`)
  args.log?.("")

  return briefingPath
}
