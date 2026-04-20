/** Extract article paragraphs from a news article HTML document. */
export function extractArticleParagraphs(
  /** The raw HTML to parse. */
  html: string,
): string[] {
  const articleMatch = html.match(/<article\b[^>]*>(.*?)<\/article>/is)
  const content = articleMatch?.[1] ?? html
  const paragraphs: string[] = []
  let totalLength = 0

  for (const match of content.matchAll(/<p\b[^>]*>(.*?)<\/p>/gis)) {
    const paragraph = match[1]
      .replace(/<[^>]+>/g, " ")
      .trim()
      .replace(/\s+/g, " ")

    if (paragraph.length <= 40) {
      continue
    }

    paragraphs.push(paragraph)
    totalLength += paragraph.length

    if (totalLength > 3000) {
      break
    }
  }

  return paragraphs
}
