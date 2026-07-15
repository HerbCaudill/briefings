import { decodeNewsText } from "./decodeNewsText.ts"

/** Parse an RSS pubDate fragment into a YYYY-MM-DD date, or undefined when unparseable. */
export function parseRssItemDate(
  /** The raw pubDate text from an RSS item. */
  text: string,
): string | undefined {
  const decoded = decodeNewsText(text)

  if (!decoded) return undefined

  const timestamp = Date.parse(decoded)

  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString().slice(0, 10)
}
