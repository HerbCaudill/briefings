import { isGenericHeadline } from "./isGenericHeadline.ts"
import type { IsUsableHeadlineCandidateArgs } from "./types.ts"

/** Check whether a decoded headline is long enough, specific enough, and not already seen. */
export function isUsableHeadlineCandidate(
  /** The headline validation arguments. */
  args: IsUsableHeadlineCandidateArgs,
): boolean {
  if (args.headline.length <= args.minimumLength || args.seenHeadlines.has(args.headline)) {
    return false
  }

  return !args.rejectGenericHeadline || !isGenericHeadline(args.headline)
}
