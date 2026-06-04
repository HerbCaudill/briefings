import { decodeNewsText } from "./decodeNewsText.ts"

/** Remove inline markup, decode entities, and normalize whitespace for an article paragraph. */
export function normalizeArticleParagraphText(
  /** The raw paragraph HTML. */
  paragraphHtml: string,
): string {
  return decodeNewsText(paragraphHtml.replace(/<[^>]+>/g, " "))
}
