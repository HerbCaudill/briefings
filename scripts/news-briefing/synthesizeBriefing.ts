import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { SELECTION_PROMPT, SYNTHESIS_PROMPT } from "./constants.ts"
import { buildSelectionInput } from "./buildSelectionInput.ts"
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
  const stagingDirectoryPath = path.join(args.rawDirectoryPath, "synthesis")
  const selectionInputPath = path.join(stagingDirectoryPath, `${args.date}-selection-input.json`)
  const selectionPath = path.join(stagingDirectoryPath, `${args.date}-selection.json`)
  const hydratedSelectionPath = path.join(
    stagingDirectoryPath,
    `${args.date}-hydrated-selection.json`,
  )

  if (!existsSync(rawBriefingPath)) {
    throw new Error(`Missing raw briefing file: ${rawBriefingPath}`)
  }

  const rawBriefing = parseJsonObject<RawBriefing>(readFileSync(rawBriefingPath, "utf8"))
  const selectionInput = buildSelectionInput(rawBriefing)

  mkdirSync(stagingDirectoryPath, { recursive: true })
  writeFileSync(selectionInputPath, JSON.stringify(selectionInput, null, 2) + "\n")

  const selectionPrompt = `${SELECTION_PROMPT}\n\nRaw briefing date: ${args.date}`
  const selectionOutput = await args.runPi({
    prompt: selectionPrompt,
    rawBriefingPath: selectionInputPath,
  })
  writeFileSync(selectionPath, `${selectionOutput.trim()}\n`)

  const selection = parseJsonObject<BriefingSelection>(selectionOutput)
  const hydratedSelection = hydrateSelectedStories(rawBriefing, selection)
  writeFileSync(hydratedSelectionPath, JSON.stringify(hydratedSelection, null, 2) + "\n")

  const synthesisPrompt = `${SYNTHESIS_PROMPT}\n\nRaw briefing date: ${args.date}`
  const synthesis = await args.runPi({
    prompt: synthesisPrompt,
    rawBriefingPath: hydratedSelectionPath,
  })

  mkdirSync(args.briefingDirectoryPath, { recursive: true })
  writeFileSync(briefingPath, `${synthesis.trim()}\n`)

  return briefingPath
}
