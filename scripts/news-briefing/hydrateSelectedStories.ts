import type { BriefingSelection, HydratedBriefingSelection, RawBriefing } from "./types.ts"

/** Add selected article bodies to a compact story-selection document. */
export function hydrateSelectedStories(
  /** The full raw briefing with article bodies. */
  rawBriefing: RawBriefing,
  /** The selected stories returned by the selection agent. */
  selection: BriefingSelection,
): HydratedBriefingSelection {
  const articlesByUrl = new Map(rawBriefing.articles.map(article => [article.url, article]))

  return {
    date: rawBriefing.date,
    stories: selection.stories.map(story => ({
      headline: story.headline,
      section: story.section,
      sources: story.sourceUrls.flatMap(url => {
        const article = articlesByUrl.get(url)

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
