import { decodeHtmlEntities } from "./decodeHtmlEntities.ts"

/** Decode and normalize text fragments from news pages and feeds. */
export function decodeNewsText(
  /** The raw text fragment from HTML or XML. */
  text: string,
): string {
  return decodeHtmlEntities(
    text
      .replace(/^\s*<!\[CDATA\[/i, "")
      .replace(/\]\]>\s*$/i, "")
      .replace(/<script\b[^>]*>.*?<\/script>/gis, " ")
      .replace(/<style\b[^>]*>.*?<\/style>/gis, " ")
      .replace(/<[^>]+>/g, " ")
      .trim()
      .replace(/\s+/g, " "),
  )
}
