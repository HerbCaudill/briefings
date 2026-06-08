import { Effect } from "effect"
import { ARTICLE_FETCH_CONCURRENCY } from "./constants.ts"
import { fetchSuccessfulArticle } from "./fetchSuccessfulArticle.ts"
import { HttpService, LoggingService } from "./runtimeServices.ts"
import type { BriefingSelection, HydratedBriefingSelection, RawBriefing } from "./types.ts"

/** Add selected article bodies to a compact story-selection document. */
export function hydrateSelectedStories(
  /** The candidate briefing with selected article metadata. */
  rawBriefing: RawBriefing,
  /** The selected stories returned by the selection agent. */
  selection: BriefingSelection,
): Effect.Effect<HydratedBriefingSelection, never, HttpService | LoggingService> {
  return Effect.gen(function* () {
    const logging = yield* LoggingService
    const articlesByUrl = new Map(rawBriefing.articles.map(article => [article.url, article]))
    const selectedUrls = [...new Set(selection.stories.flatMap(story => story.sourceUrls))]
    const selectedArticles = selectedUrls.flatMap(url => {
      const article = articlesByUrl.get(url)

      return article ? [article] : []
    })
    const hydratedArticles = yield* Effect.forEach(
      selectedArticles,
      article =>
        Effect.gen(function* () {
          const hydratedArticle = yield* fetchSuccessfulArticle(article)
          const icon = hydratedArticle?.body ? "✅" : "❌"
          yield* logging.log(`${icon} ${article.headline} (${article.source})`)

          return hydratedArticle
        }),
      { concurrency: ARTICLE_FETCH_CONCURRENCY },
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

          if (!article?.body) {
            return []
          }

          return [
            {
              body: article.body,
              headline: article.headline,
              source: article.source,
              url: article.url,
            },
          ]
        }),
      })),
    }
  })
}
