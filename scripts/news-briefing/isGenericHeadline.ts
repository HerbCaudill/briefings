const GENERIC_HEADLINES = new Set([
  "envia una carta del lector",
  "segueix-nos a les xarxes socials:",
  "ultimas noticias",
  "últimas noticias",
  "últimes notícies",
])

/** Return true when a heading is navigation chrome rather than an article headline. */
export function isGenericHeadline(
  /** The extracted headline text. */
  headline: string,
): boolean {
  return (
    GENERIC_HEADLINES.has(headline.toLocaleLowerCase()) ||
    (headline === headline.toLocaleUpperCase() && headline.length < 45)
  )
}
