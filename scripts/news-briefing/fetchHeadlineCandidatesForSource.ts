import { extractHeadlineCandidates } from "./extractHeadlineCandidates.ts"
import { getSourceListingPageUrls } from "./getSourceListingPageUrls.ts"
import { shouldUseHeadlineCandidates } from "./shouldUseHeadlineCandidates.ts"
import type { BuildRawBriefingArgs, HeadlineCandidate } from "./types.ts"

/** Fetch and select the candidate set to use for one source. */
export async function fetchHeadlineCandidatesForSource(
  /** The source listing fetch dependencies and selection settings. */
  args: FetchHeadlineCandidatesForSourceArgs,
): Promise<HeadlineCandidate[]> {
  const listingPageUrls = getSourceListingPageUrls(args.sourceConfig)

  for (const [index, listingPageUrl] of listingPageUrls.entries()) {
    let listingPageHtml: string

    try {
      listingPageHtml = await args.fetchPageHtml(listingPageUrl)
    } catch {
      continue
    }

    const headlineCandidates = extractHeadlineCandidates(listingPageUrl, listingPageHtml)

    if (
      shouldUseHeadlineCandidates({
        candidateCount: headlineCandidates.length,
        isFinalListingPage: index === listingPageUrls.length - 1,
        maxHeadlinesPerSource: args.maxHeadlinesPerSource,
        preferFallbackUrls: args.sourceConfig.preferFallbackUrls ?? false,
      })
    ) {
      return headlineCandidates
    }
  }

  return []
}

type FetchHeadlineCandidatesForSourceArgs = {
  /** Fetch one listing page as HTML. */
  fetchPageHtml: (url: string) => Promise<string>
  /** The maximum number of headlines to keep for this source. */
  maxHeadlinesPerSource: number
  /** The source whose listing pages should be fetched. */
  sourceConfig: BuildRawBriefingArgs["sourceConfigs"][number]
}
