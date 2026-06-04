import { Effect, Schedule } from "effect"
import { ARTICLE_FETCH_RETRY_LIMIT } from "./constants.ts"
import { extractArticleParagraphs } from "./extractArticleParagraphs.ts"
import { toError } from "./runtimeServices.ts"
import type { RawBriefingArticle } from "./types.ts"

/** Fetch one article body and return a populated record only when extraction succeeds. */
export async function fetchSuccessfulArticle(
  /** The article record to populate. */
  article: RawBriefingArticle,
  /** The HTML fetch dependency. */
  fetchPageHtml: (url: string) => Promise<string>,
): Promise<RawBriefingArticle | null> {
  if (article.body) {
    return article
  }

  try {
    const articleHtml = await Effect.tryPromise({
      catch: error => toError(error),
      try: () => fetchPageHtml(article.url),
    }).pipe(Effect.retry(Schedule.recurs(ARTICLE_FETCH_RETRY_LIMIT - 1)), Effect.runPromise)
    const body = extractArticleParagraphs(articleHtml).join("\n\n")

    if (!body) {
      return null
    }

    return {
      ...article,
      body,
    }
  } catch {
    return null
  }
}
