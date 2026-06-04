/** Return true when a URL points to a plausible HTTP article page. */
export function isHttpArticleUrl(
  /** The URL to inspect. */
  url: URL,
): boolean {
  return ["http:", "https:"].includes(url.protocol) && url.hash === ""
}
