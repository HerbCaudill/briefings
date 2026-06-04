import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { DEFAULT_MAX_HEADLINES_PER_SOURCE } from "./constants.ts"
import { extractHeadlineCandidates } from "./extractHeadlineCandidates.ts"
import { formatCandidateSourceLine } from "./formatCandidateSourceLine.ts"
import type {
  BriefingCandidateArticle,
  BuildRawBriefingArgs,
  HeadlineCandidate,
  RawBriefing,
} from "./types.ts"

/** Fetch source listing pages, then persist one candidate briefing JSON file. */
export async function buildRawBriefing(
  /** The fetch-stage configuration and dependencies. */
  args: BuildRawBriefingArgs,
): Promise<RawBriefing> {
  const maxHeadlinesPerSource = args.maxHeadlinesPerSource ?? DEFAULT_MAX_HEADLINES_PER_SOURCE
  const articleMap = new Map<string, BriefingCandidateArticle>()

  for (const sourceConfig of args.sourceConfigs) {
    let allHeadlineCandidates: HeadlineCandidate[] = []
    const listingPageUrls = sourceConfig.preferFallbackUrls
      ? [...(sourceConfig.fallbackUrls ?? []), sourceConfig.homepageUrl]
      : [sourceConfig.homepageUrl, ...(sourceConfig.fallbackUrls ?? [])]

    for (const candidateListingPageUrl of listingPageUrls) {
      let homepageHtml: string

      try {
        homepageHtml = await args.fetchPageHtml(candidateListingPageUrl)
      } catch {
        continue
      }

      const candidateHeadlines = extractHeadlineCandidates(candidateListingPageUrl, homepageHtml)

      if (
        (sourceConfig.preferFallbackUrls && candidateHeadlines.length > 0) ||
        candidateHeadlines.length >= Math.min(5, maxHeadlinesPerSource) ||
        candidateListingPageUrl === listingPageUrls.at(-1)
      ) {
        allHeadlineCandidates = candidateHeadlines
        break
      }
    }

    const headlineCandidates = allHeadlineCandidates.slice(0, maxHeadlinesPerSource)
    args.log?.(formatCandidateSourceLine(sourceConfig.name, headlineCandidates.length))

    for (const candidate of headlineCandidates) {
      if (!candidate.url) {
        continue
      }

      if (articleMap.has(candidate.url)) {
        continue
      }

      articleMap.set(candidate.url, {
        headline: candidate.headline,
        region: sourceConfig.region,
        source: sourceConfig.name,
        url: candidate.url,
      })
    }
  }

  const articles = [...articleMap.values()]

  const rawBriefing: RawBriefing = {
    articles,
    date: args.date,
  }

  const rawBriefingPath = path.join(args.rawDirectoryPath, `${args.date}.json`)

  mkdirSync(args.rawDirectoryPath, { recursive: true })
  writeFileSync(rawBriefingPath, JSON.stringify(rawBriefing, null, 2) + "\n")

  return rawBriefing
}
