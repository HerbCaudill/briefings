import { ARTICLE_FETCH_CONCURRENCY } from "./constants.ts"
import { fetchSuccessfulArticle } from "./fetchSuccessfulArticle.ts"
import { mapWithConcurrency } from "./mapWithConcurrency.ts"
import type { BriefingSelection, HydratedBriefingSelection, RawBriefing } from "./types.ts"

/** Add selected article bodies to a compact story-selection document. */
export async function hydrateSelectedStories(
  /** The full raw briefing with candidate article metadata. */
  rawBriefing: RawBriefing,
  /** The selected stories returned by the selection agent. */
  selection: BriefingSelection,
  /** Fetch page HTML for selected article URLs that do not already have a body. */
  fetchPageHtml: (url: string) => Promise<string>,
): Promise<HydratedBriefingSelection> {
  const articlesByUrl = new Map(rawBriefing.articles.map(article => [article.url, article]))
  const selectedUrls = [...new Set(selection.stories.flatMap(story => story.sourceUrls))]
  const selectedArticles = selectedUrls.flatMap(url => {
    const article = articlesByUrl.get(url)

    return article ? [article] : []
  })
  const hydratedArticles = await mapWithConcurrency(
    selectedArticles,
    ARTICLE_FETCH_CONCURRENCY,
    article => fetchSuccessfulArticle(article, fetchPageHtml),
  )
  const hydratedArticlesByUrl = new Map(
    hydratedArticles.flatMap(article => (article ? [[article.url, article]] : [])),
  )

  return {
    date: rawBriefing.date,
    stories: selection.stories.map(story => ({
      headline: story.headline,
      section: story.section,
      sources: story.sourceUrls.flatMap(url => {
        const article = hydratedArticlesByUrl.get(url)

        if (!article) {
          return []
        }

        return [
          {
            body: article.body,
            headline: article.headline,
            source: article.source.name,
            url: article.url,
          },
        ]
      }),
    })),
  }
}
