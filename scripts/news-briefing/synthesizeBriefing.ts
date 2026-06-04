import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import {
  getFinalBriefingPath,
  getRawBriefingPath,
  getSelectionBriefingPath,
} from "./briefingPaths.ts"
import { SELECTION_PROMPT, SYNTHESIS_PROMPT } from "./constants.ts"
import { decodeJsonWithSchema } from "./decodeJsonWithSchema.ts"
import { formatElapsedSeconds } from "./formatElapsedSeconds.ts"
import { hydrateSelectedStories } from "./hydrateSelectedStories.ts"
import { BriefingSelectionSchema, FinalBriefingSchema, RawBriefingSchema } from "./schemas.ts"
import type { BriefingSelection, RawBriefing, SynthesizeBriefingArgs } from "./types.ts"

/** Run pi in selection and synthesis stages, then write the final briefing JSON. */
export async function synthesizeBriefing(
  /** The synthesis-stage configuration and pi runner dependency. */
  args: SynthesizeBriefingArgs,
): Promise<string> {
  const now = args.now ?? Date.now
  const rawBriefingPath = getRawBriefingPath(args.rawDirectoryPath, args.date)
  const briefingPath = getFinalBriefingPath(args.briefingDirectoryPath, args.date)
  const selectionPath = getSelectionBriefingPath(args.rawDirectoryPath, args.date)

  if (!existsSync(rawBriefingPath)) {
    throw new Error(`Missing raw briefing file: ${rawBriefingPath}`)
  }

  const decodedRawBriefing = decodeJsonWithSchema(
    RawBriefingSchema,
    readFileSync(rawBriefingPath, "utf8"),
    "raw briefing",
  )
  const rawBriefing: RawBriefing = {
    articles: [...decodedRawBriefing.articles],
    date: decodedRawBriefing.date,
  }

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
  const decodedSelection = decodeJsonWithSchema(
    BriefingSelectionSchema,
    selectionOutput,
    "pi selection",
  )
  const selection: BriefingSelection = {
    stories: decodedSelection.stories.map(story => ({
      headline: story.headline,
      section: story.section,
      sourceUrls: [...story.sourceUrls],
    })),
  }
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

  const finalBriefing = decodeJsonWithSchema(FinalBriefingSchema, synthesis, "pi synthesis")

  mkdirSync(args.briefingDirectoryPath, { recursive: true })
  writeFileSync(briefingPath, JSON.stringify(finalBriefing, null, 2) + "\n")
  args.log?.(`done (${formatElapsedSeconds(now() - writingStart)})`)
  args.log?.("")

  return briefingPath
}
