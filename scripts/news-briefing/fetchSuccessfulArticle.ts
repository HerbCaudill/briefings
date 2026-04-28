import { ARTICLE_FETCH_RETRY_LIMIT } from "./constants.ts"
import { extractArticleParagraphs } from "./extractArticleParagraphs.ts"
import { retry } from "./retry.ts"
import type { RawBriefingArticle } from "./types.ts"

/** Fetch one article body and return a populated record only when extraction succeeds. */
export async function fetchSuccessfulArticle(
  /** The article record to populate. */
  article: RawBriefingArticle,
  /** The HTML fetch dependency. */
  fetchPageHtml: (url: string) => Promise<string>,
): Promise<RawBriefingArticle | null> {
  try {
    const articleHtml = await retry(() => fetchPageHtml(article.url), ARTICLE_FETCH_RETRY_LIMIT)
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
