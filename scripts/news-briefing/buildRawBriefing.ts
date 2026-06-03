import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { ARTICLE_FETCH_CONCURRENCY, DEFAULT_MAX_HEADLINES_PER_SOURCE } from "./constants.ts"
import { extractHeadlineCandidates } from "./extractHeadlineCandidates.ts"
import { fetchSuccessfulArticle } from "./fetchSuccessfulArticle.ts"
import { mapWithConcurrency } from "./mapWithConcurrency.ts"
import type {
  BuildRawBriefingArgs,
  HeadlineCandidate,
  RawBriefing,
  RawBriefingArticle,
} from "./types.ts"

/** Fetch homepage and article content, then persist one raw briefing JSON file. */
export async function buildRawBriefing(
  /** The fetch-stage configuration and dependencies. */
  args: BuildRawBriefingArgs,
): Promise<RawBriefing> {
  const maxHeadlinesPerSource = args.maxHeadlinesPerSource ?? DEFAULT_MAX_HEADLINES_PER_SOURCE
  const articleMap = new Map<string, RawBriefingArticle>()

  for (const sourceConfig of args.sourceConfigs) {
    let listingPageUrl = sourceConfig.homepageUrl
    let allHeadlineCandidates: HeadlineCandidate[] = []
    const listingPageUrls =
      sourceConfig.preferFallbackUrls ?
        [...(sourceConfig.fallbackUrls ?? []), sourceConfig.homepageUrl]
      : [sourceConfig.homepageUrl, ...(sourceConfig.fallbackUrls ?? [])]

    for (const candidateListingPageUrl of listingPageUrls) {
      let homepageHtml: string

      if (candidateListingPageUrl === sourceConfig.homepageUrl) {
        args.log?.(`Fetching homepage for ${sourceConfig.name}...`)
      }

      try {
        homepageHtml = await args.fetchPageHtml(candidateListingPageUrl)
      } catch {
        if (candidateListingPageUrl === listingPageUrls.at(-1)) {
          args.log?.(`Skipped ${sourceConfig.name}; homepage fetch failed.`)
        }

        continue
      }

      const candidateHeadlines = extractHeadlineCandidates(candidateListingPageUrl, homepageHtml)

      if (
        (sourceConfig.preferFallbackUrls && candidateHeadlines.length > 0) ||
        candidateHeadlines.length >= Math.min(5, maxHeadlinesPerSource) ||
        candidateListingPageUrl === listingPageUrls.at(-1)
      ) {
        listingPageUrl = candidateListingPageUrl
        allHeadlineCandidates = candidateHeadlines
        break
      }
    }

    const source = {
      homepageUrl: sourceConfig.homepageUrl,
      key: sourceConfig.key,
      name: sourceConfig.name,
      region: sourceConfig.region,
    }
    const headlineCandidates = allHeadlineCandidates.slice(0, maxHeadlinesPerSource)
    args.log?.(
      `Found ${allHeadlineCandidates.length} headline candidates for ${sourceConfig.name}; using ${headlineCandidates.length}.`,
    )

    for (const candidate of headlineCandidates) {
      if (!candidate.url) {
        continue
      }

      const sighting = {
        headline: candidate.headline,
        listingPageUrl,
        position: candidate.position,
        source,
      }
      const existingArticle = articleMap.get(candidate.url)

      if (existingArticle) {
        articleMap.set(candidate.url, {
          ...existingArticle,
          sightings: [...existingArticle.sightings, sighting],
        })
        continue
      }

      articleMap.set(candidate.url, {
        body: candidate.body ?? "",
        firstSeenPosition: candidate.position,
        headline: candidate.headline,
        listingPageUrl,
        sightings: [sighting],
        source,
        url: candidate.url,
      })
    }
  }

  const articleRecords = [...articleMap.values()]
  let fetchedArticleCount = 0

  args.log?.(`Fetching ${articleRecords.length} unique article bodies...`)

  const articles = (
    await mapWithConcurrency(articleRecords, ARTICLE_FETCH_CONCURRENCY, async article => {
      const result = await fetchSuccessfulArticle(article, args.fetchPageHtml)
      fetchedArticleCount += 1
      args.log?.(
        `Fetched article ${fetchedArticleCount}/${articleRecords.length}: ${article.headline}`,
      )
      return result
    })
  ).filter(article => article !== null)

  args.log?.(`Kept ${articles.length} article bodies after extraction.`)

  const rawBriefing: RawBriefing = {
    articles,
    createdAt: new Date().toISOString(),
    date: args.date,
  }

  const rawBriefingPath = path.join(args.rawDirectoryPath, `${args.date}.json`)

  mkdirSync(args.rawDirectoryPath, { recursive: true })
  writeFileSync(rawBriefingPath, JSON.stringify(rawBriefing, null, 2) + "\n")
  args.log?.(`Wrote raw briefing to ${rawBriefingPath}.`)

  return rawBriefing
}
