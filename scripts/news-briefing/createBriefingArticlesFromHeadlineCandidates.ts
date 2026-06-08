import type { BriefingCandidateArticle, HeadlineCandidate, NewsRegion } from "./types.ts"

/** Convert headline candidates to briefing articles while skipping duplicates and empty URLs. */
export function createBriefingArticlesFromHeadlineCandidates(
  /** Candidate conversion inputs and existing article URL state. */
  args: CreateBriefingArticlesFromHeadlineCandidatesArgs,
): BriefingCandidateArticle[] {
  const seenUrls = new Set(args.existingArticleUrls)

  return args.candidates.flatMap(candidate => {
    if (!candidate.url || seenUrls.has(candidate.url)) return []

    seenUrls.add(candidate.url)

    return [
      {
        ...(candidate.body ? { body: candidate.body } : {}),
        headline: candidate.headline,
        region: args.region,
        source: args.sourceName,
        url: candidate.url,
      },
    ]
  })
}

export type CreateBriefingArticlesFromHeadlineCandidatesArgs = {
  /** The headline candidates to convert. */
  candidates: HeadlineCandidate[]
  /** URLs already included in the briefing. */
  existingArticleUrls: Set<string>
  /** The region to assign to each article. */
  region: NewsRegion
  /** The source name to assign to each article. */
  sourceName: string
}
