import { rm } from "node:fs/promises"
import path from "node:path"
import type { ClearExistingBriefingFilesArgs } from "./types.ts"

/** Delete generated briefing files for one date so the pipeline can produce fresh output. */
export async function clearExistingBriefingFiles(
  /** The target directories and briefing date. */
  args: ClearExistingBriefingFilesArgs,
): Promise<void> {
  const paths = [
    path.join(args.briefingDirectoryPath, `${args.date}.json`),
    path.join(args.rawDirectoryPath, `${args.date}.json`),
    path.join(args.rawDirectoryPath, `${args.date}-selection.json`),
  ]

  await Promise.all(paths.map(filePath => rm(filePath, { force: true })))
}
