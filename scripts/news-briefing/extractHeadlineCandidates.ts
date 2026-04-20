import type { HeadlineCandidate } from "./types.ts"

/** Extract headline candidates from a news homepage HTML document. */
export function extractHeadlineCandidates(
  /** The base URL used to resolve relative article URLs. */
  baseUrl: string,
  /** The raw HTML to parse. */
  html: string,
): HeadlineCandidate[] {
  const anchorRanges: Array<{ end: number; href: string; start: number }> = []
  const ariaMap = new Map<string, string>()
  const seenHeadlines = new Set<string>()
  const candidates: HeadlineCandidate[] = []

  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const href = match[1]
    const start = match.index ?? 0
    const openTagEnd = start + match[0].length
    const close = html.indexOf("</a>", openTagEnd)

    if (close > 0) {
      anchorRanges.push({ end: close + 4, href, start })
    }
  }

  for (const match of html.matchAll(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*aria-label=["']([^"']+)["'][^>]*>/gi,
  )) {
    ariaMap.set(match[2].trim(), match[1])
  }

  for (const match of html.matchAll(
    /<a\b[^>]*aria-label=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
  )) {
    ariaMap.set(match[1].trim(), match[2])
  }

  for (const match of html.matchAll(/<(h[23])\b[^>]*>(.*?)<\/\1>/gis)) {
    const content = match[2]
    const headline = content
      .replace(/<[^>]+>/g, " ")
      .trim()
      .replace(/\s+/g, " ")

    if (headline.length <= 15 || seenHeadlines.has(headline)) {
      continue
    }

    seenHeadlines.add(headline)

    const inlineHrefMatch = content.match(/href=["']([^"']+)["']/i)
    const headingPosition = match.index ?? 0
    const parentAnchor = anchorRanges.find(
      anchorRange => anchorRange.start < headingPosition && headingPosition < anchorRange.end,
    )
    const resolvedHref = inlineHrefMatch?.[1] ?? parentAnchor?.href ?? ariaMap.get(headline) ?? ""
    const url = resolvedHref ? new URL(resolvedHref, baseUrl).toString() : ""

    candidates.push({
      headline,
      position: candidates.length + 1,
      url,
    })
  }

  return candidates
}
