import { decodeNewsText } from "./decodeNewsText.ts"
import { isGenericHeadline } from "./isGenericHeadline.ts"
import type { HeadlineCandidate } from "./types.ts"

/** Extract headline candidates from a news homepage or RSS document. */
export function extractHeadlineCandidates(
  /** The base URL used to resolve relative article URLs. */
  baseUrl: string,
  /** The raw HTML or XML to parse. */
  html: string,
): HeadlineCandidate[] {
  const anchorRanges: Array<{ end: number; href: string; start: number }> = []
  const ariaMap = new Map<string, string>()
  const seenHeadlines = new Set<string>()
  const candidates: HeadlineCandidate[] = []

  for (const match of html.matchAll(/<item\b[^>]*>(.*?)<\/item>/gis)) {
    const itemContent = match[1]
    const title = itemContent.match(/<title\b[^>]*>(.*?)<\/title>/is)?.[1] ?? ""
    const link = itemContent.match(/<link\b[^>]*>(.*?)<\/link>/is)?.[1] ?? ""
    const description =
      itemContent.match(/<content:encoded\b[^>]*>(.*?)<\/content:encoded>/is)?.[1] ??
      itemContent.match(/<description\b[^>]*>(.*?)<\/description>/is)?.[1] ??
      ""
    const headline = decodeNewsText(title)
    const body = decodeNewsText(description)
    const resolvedHref = link
      .replace(/^\s*<!\[CDATA\[/i, "")
      .replace(/\]\]>\s*$/i, "")
      .trim()

    if (headline.length <= 15 || seenHeadlines.has(headline) || !resolvedHref) {
      continue
    }

    seenHeadlines.add(headline)
    candidates.push({
      body: body.length > 40 ? body : undefined,
      headline,
      position: candidates.length + 1,
      url: new URL(resolvedHref, baseUrl).toString(),
    })
  }

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
    const headline = decodeNewsText(content)

    if (headline.length <= 15 || seenHeadlines.has(headline) || isGenericHeadline(headline)) {
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

  for (const anchorRange of anchorRanges) {
    const anchorHtml = html.slice(anchorRange.start, anchorRange.end)
    const headline = decodeNewsText(anchorHtml)
    const url = new URL(anchorRange.href, baseUrl)
    const pathSegments = url.pathname.split("/").filter(Boolean)

    if (
      headline.length <= 45 ||
      seenHeadlines.has(headline) ||
      isGenericHeadline(headline) ||
      ["http:", "https:"].includes(url.protocol) === false ||
      pathSegments.length < 2
    ) {
      continue
    }

    seenHeadlines.add(headline)
    candidates.push({
      headline,
      position: candidates.length + 1,
      url: url.toString(),
    })
  }

  return candidates
}
