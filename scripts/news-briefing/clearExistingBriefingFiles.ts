import { rm } from "node:fs/promises"
import {
  getFinalBriefingPath,
  getRawBriefingPath,
  getSelectionBriefingPath,
} from "./briefingPaths.ts"
import type { ClearExistingBriefingFilesArgs } from "./types.ts"

/** Delete generated briefing files for one date so the pipeline can produce fresh output. */
export async function clearExistingBriefingFiles(
  /** The target directories and briefing date. */
  args: ClearExistingBriefingFilesArgs,
): Promise<void> {
  const paths = [
    getFinalBriefingPath(args.briefingDirectoryPath, args.date),
    getRawBriefingPath(args.rawDirectoryPath, args.date),
    getSelectionBriefingPath(args.rawDirectoryPath, args.date),
  ]

  await Promise.all(paths.map(filePath => rm(filePath, { force: true })))
}
