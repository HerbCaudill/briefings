import type { IsStaleArticleDateArgs } from "./types.ts"

const millisecondsPerDay = 86_400_000

/** Check whether an article date is more than the allowed age before the briefing date. */
export function isStaleArticleDate(
  /** The article date, briefing date, and allowed age in days. */
  args: IsStaleArticleDateArgs,
): boolean {
  const articleTimestamp = Date.parse(`${args.articleDate}T00:00:00Z`)
  const briefingTimestamp = Date.parse(`${args.briefingDate}T00:00:00Z`)

  if (Number.isNaN(articleTimestamp) || Number.isNaN(briefingTimestamp)) return false

  return articleTimestamp < briefingTimestamp - args.maxAgeDays * millisecondsPerDay
}
