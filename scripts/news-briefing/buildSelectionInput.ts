import type { BriefingSelectionInput, RawBriefing } from "./types.ts"

/** Build a compact input file for the story-selection agent. */
export function buildSelectionInput(
  /** The full raw briefing with article bodies and metadata. */
  rawBriefing: RawBriefing,
): BriefingSelectionInput {
  return {
    articles: rawBriefing.articles.map(article => ({
      firstSeenPosition: article.firstSeenPosition,
      headline: article.headline,
      source: article.source.name,
      region: article.source.region,
      url: article.url,
    })),
    date: rawBriefing.date,
  }
}
