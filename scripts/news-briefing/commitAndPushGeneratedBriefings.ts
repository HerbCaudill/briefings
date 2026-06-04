import { getBriefingIndexPath, getGeneratedBriefingGitPaths } from "./briefingPaths.ts"
import { PUBLIC_BRIEFINGS_DIRECTORY_PATH } from "./constants.ts"
import { generateBriefingIndex } from "./generateBriefingIndex.ts"
import { runProcessWithForwardedOutput } from "./runProcessWithForwardedOutput.ts"
import type { CommitAndPushGeneratedBriefingsArgs } from "./types.ts"

/** Commit and push the generated briefing files for the provided dates. */
export async function commitAndPushGeneratedBriefings(
  /** The generated briefing dates and optional command runner. */
  args: CommitAndPushGeneratedBriefingsArgs,
): Promise<void> {
  if (args.dates.length === 0) {
    return
  }

  const briefingDirectoryPath = args.briefingDirectoryPath ?? PUBLIC_BRIEFINGS_DIRECTORY_PATH
  const runCommand = args.runCommand ?? runProcessWithForwardedOutput
  const generatedPaths = getGeneratedBriefingGitPaths(args.dates)
  const commitMessage = `Briefing: add generated briefings for ${args.dates.join(", ")}`

  generateBriefingIndex(briefingDirectoryPath)

  await runCommand("git", ["add", getBriefingIndexPath("public/briefings"), ...generatedPaths])
  await runCommand("git", ["commit", "-m", commitMessage])
  await runCommand("git", ["pull", "--rebase"])
  await runCommand("git", ["push"])
}
