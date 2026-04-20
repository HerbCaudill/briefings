import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { SYNTHESIS_PROMPT } from "./constants.ts"
import type { SynthesizeBriefingArgs } from "./types.ts"

/** Run pi against one raw briefing file and write the final briefing JSON. */
export async function synthesizeBriefing(
  /** The synthesis-stage configuration and pi runner dependency. */
  args: SynthesizeBriefingArgs,
): Promise<string> {
  const rawBriefingPath = path.join(args.rawDirectoryPath, `${args.date}.json`)
  const briefingPath = path.join(args.briefingDirectoryPath, `${args.date}.json`)
  const rawBriefing = readFileSync(rawBriefingPath, "utf8")
  const prompt = `${SYNTHESIS_PROMPT}\n\nRaw briefing date: ${args.date}\nRaw briefing preview:\n${rawBriefing.slice(0, 4000)}`
  const synthesis = await args.runPi({ prompt, rawBriefingPath })

  mkdirSync(args.briefingDirectoryPath, { recursive: true })
  writeFileSync(briefingPath, `${synthesis.trim()}\n`)

  return briefingPath
}
