import { Effect } from "effect"
import { getRawBriefingPath } from "./briefingPaths.ts"
import { DEFAULT_MAX_HEADLINES_PER_SOURCE } from "./constants.ts"
import { createBriefingArticlesFromHeadlineCandidates } from "./createBriefingArticlesFromHeadlineCandidates.ts"
import { fetchHeadlineCandidatesForSource } from "./fetchHeadlineCandidatesForSource.ts"
import { formatCandidateSourceLine } from "./formatCandidateSourceLine.ts"
import { FileSystemService } from "./runtimeServices.ts"
import type { BuildRawBriefingArgs, RawBriefing } from "./types.ts"

/** Fetch source listing pages, then persist one candidate briefing JSON file. */
export async function buildRawBriefing(
  /** The fetch-stage configuration and dependencies. */
  args: BuildRawBriefingArgs,
): Promise<RawBriefing> {
  const maxHeadlinesPerSource = args.maxHeadlinesPerSource ?? DEFAULT_MAX_HEADLINES_PER_SOURCE
  const articlesByUrl = new Map<string, RawBriefing["articles"][number]>()

  for (const sourceConfig of args.sourceConfigs) {
    const headlineCandidates = (
      await fetchHeadlineCandidatesForSource({
        fetchPageHtml: args.fetchPageHtml,
        maxHeadlinesPerSource,
        sourceConfig,
      })
    ).slice(0, maxHeadlinesPerSource)
    args.log?.(formatCandidateSourceLine(sourceConfig.name, headlineCandidates.length))

    const articles = createBriefingArticlesFromHeadlineCandidates({
      candidates: headlineCandidates,
      existingArticleUrls: new Set(articlesByUrl.keys()),
      region: sourceConfig.region,
      sourceName: sourceConfig.name,
    })

    for (const article of articles) {
      articlesByUrl.set(article.url, article)
    }
  }

  const rawBriefing: RawBriefing = {
    articles: [...articlesByUrl.values()],
    date: args.date,
  }

  const rawBriefingPath = getRawBriefingPath(args.rawDirectoryPath, args.date)

  await Effect.gen(function* () {
    const fileSystem = yield* FileSystemService
    yield* fileSystem.makeDirectory(args.rawDirectoryPath)
    yield* fileSystem.writeText(rawBriefingPath, JSON.stringify(rawBriefing, null, 2) + "\n")
  }).pipe(
    Effect.provide(FileSystemService.Live), //
    Effect.runPromise,
  )

  return rawBriefing
}
