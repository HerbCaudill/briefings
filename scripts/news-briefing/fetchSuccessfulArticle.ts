import { Effect, Schedule } from "effect"
import { ARTICLE_FETCH_RETRY_LIMIT } from "./constants.ts"
import { extractArticleParagraphs } from "./extractArticleParagraphs.ts"
import { HttpService } from "./runtimeServices.ts"
import type { RawBriefingArticle } from "./types.ts"

/** Fetch one article body and return a populated record only when extraction succeeds. */
export function fetchSuccessfulArticle(
  /** The article record to populate. */
  article: RawBriefingArticle,
): Effect.Effect<RawBriefingArticle | null, never, HttpService> {
  if (article.body) {
    return Effect.succeed(article)
  }

  return Effect.gen(function* () {
    const http = yield* HttpService
    const articleHtml = yield* http.fetchPageHtml(article.url).pipe(
      Effect.retry(Schedule.recurs(ARTICLE_FETCH_RETRY_LIMIT - 1)),
      Effect.catchAll(() => Effect.succeed(null)),
    )

    if (!articleHtml) {
      return null
    }

    const body = extractArticleParagraphs(articleHtml).join("\n\n")

    if (!body) {
      return null
    }

    return {
      ...article,
      body,
    }
  })
}
