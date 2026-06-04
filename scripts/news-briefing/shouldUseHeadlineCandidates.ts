/** Decide whether a listing page candidate set should be used for a source. */
export function shouldUseHeadlineCandidates(
  /** The candidate set metadata and source listing settings. */
  args: ShouldUseHeadlineCandidatesArgs,
): boolean {
  return (
    (args.preferFallbackUrls && args.candidateCount > 0) ||
    args.candidateCount >= Math.min(5, args.maxHeadlinesPerSource) ||
    args.isFinalListingPage
  )
}

export type ShouldUseHeadlineCandidatesArgs = {
  /** The number of candidates extracted from the current listing page. */
  candidateCount: number
  /** Whether this listing page is the last URL that can be attempted. */
  isFinalListingPage: boolean
  /** The maximum number of headlines to keep for the source. */
  maxHeadlinesPerSource: number
  /** Whether fallback listing pages are preferred over the primary homepage. */
  preferFallbackUrls: boolean
}
