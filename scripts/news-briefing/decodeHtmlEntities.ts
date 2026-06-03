/** Decode the small set of HTML entities that appear in extracted headlines and RSS bodies. */
export function decodeHtmlEntities(
  /** The text that may contain HTML entities. */
  text: string,
): string {
  return text
    .replace(/&#(\d+);/g, (_, codePoint: string) => String.fromCodePoint(Number(codePoint)))
    .replace(/&#x([\da-f]+);/gi, (_, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
}
