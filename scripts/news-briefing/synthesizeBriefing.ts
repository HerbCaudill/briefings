import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { SELECTION_PROMPT, SYNTHESIS_PROMPT } from "./constants.ts"
import { hydrateSelectedStories } from "./hydrateSelectedStories.ts"
import { parseJsonObject } from "./parseJsonObject.ts"
import type { BriefingSelection, RawBriefing, SynthesizeBriefingArgs } from "./types.ts"

/** Run pi in selection and synthesis stages, then write the final briefing JSON. */
export async function synthesizeBriefing(
  /** The synthesis-stage configuration and pi runner dependency. */
  args: SynthesizeBriefingArgs,
): Promise<string> {
  const rawBriefingPath = path.join(args.rawDirectoryPath, `${args.date}.json`)
  const briefingPath = path.join(args.briefingDirectoryPath, `${args.date}.json`)
  const selectionPath = path.join(args.rawDirectoryPath, `${args.date}-selection.json`)

  if (!existsSync(rawBriefingPath)) {
    throw new Error(`Missing raw briefing file: ${rawBriefingPath}`)
  }

  const rawBriefing = parseJsonObject<RawBriefing>(readFileSync(rawBriefingPath, "utf8"))

  const selectionPrompt = `${SELECTION_PROMPT}\n\nRaw briefing date: ${args.date}`
  const selectionOutput = await args.runPi({
    prompt: selectionPrompt,
    rawBriefingPath,
  })
  writeFileSync(selectionPath, `${selectionOutput.trim()}\n`)

  const selection = parseJsonObject<BriefingSelection>(selectionOutput)
  const hydratedSelection = await hydrateSelectedStories(rawBriefing, selection, args.fetchPageHtml)
  writeFileSync(selectionPath, JSON.stringify(hydratedSelection, null, 2) + "\n")

  const synthesisPrompt = `${SYNTHESIS_PROMPT}\n\nRaw briefing date: ${args.date}`
  const synthesis = await args.runPi({
    prompt: synthesisPrompt,
    rawBriefingPath: selectionPath,
  })

  mkdirSync(args.briefingDirectoryPath, { recursive: true })
  writeFileSync(briefingPath, `${synthesis.trim()}\n`)

  return briefingPath
}
