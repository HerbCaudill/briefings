import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { ARTICLE_FETCH_CONCURRENCY, DEFAULT_MAX_HEADLINES_PER_SOURCE } from "./constants.ts"
import { extractHeadlineCandidates } from "./extractHeadlineCandidates.ts"
import { fetchSuccessfulArticle } from "./fetchSuccessfulArticle.ts"
import { mapWithConcurrency } from "./mapWithConcurrency.ts"
import type { BuildRawBriefingArgs, RawBriefing, RawBriefingArticle } from "./types.ts"

/** Fetch homepage and article content, then persist one raw briefing JSON file. */
export async function buildRawBriefing(
  /** The fetch-stage configuration and dependencies. */
  args: BuildRawBriefingArgs,
): Promise<RawBriefing> {
  const maxHeadlinesPerSource = args.maxHeadlinesPerSource ?? DEFAULT_MAX_HEADLINES_PER_SOURCE
  const articleMap = new Map<string, RawBriefingArticle>()

  for (const sourceConfig of args.sourceConfigs) {
    const homepageHtml = await args.fetchPageHtml(sourceConfig.homepageUrl)
    const source = {
      homepageUrl: sourceConfig.homepageUrl,
      key: sourceConfig.key,
      name: sourceConfig.name,
      region: sourceConfig.region,
    }
    const headlineCandidates = extractHeadlineCandidates(
      sourceConfig.homepageUrl,
      homepageHtml,
    ).slice(0, maxHeadlinesPerSource)

    for (const candidate of headlineCandidates) {
      if (!candidate.url) {
        continue
      }

      const sighting = {
        headline: candidate.headline,
        listingPageUrl: sourceConfig.homepageUrl,
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
        body: "",
        firstSeenPosition: candidate.position,
        headline: candidate.headline,
        listingPageUrl: sourceConfig.homepageUrl,
        sightings: [sighting],
        source,
        url: candidate.url,
      })
    }
  }

  const articles = (
    await mapWithConcurrency([...articleMap.values()], ARTICLE_FETCH_CONCURRENCY, article =>
      fetchSuccessfulArticle(article, args.fetchPageHtml),
    )
  ).filter(article => article !== null)

  const rawBriefing: RawBriefing = {
    articles,
    createdAt: new Date().toISOString(),
    date: args.date,
  }

  mkdirSync(args.rawDirectoryPath, { recursive: true })
  writeFileSync(
    path.join(args.rawDirectoryPath, `${args.date}.json`),
    JSON.stringify(rawBriefing, null, 2) + "\n",
  )

  return rawBriefing
}
