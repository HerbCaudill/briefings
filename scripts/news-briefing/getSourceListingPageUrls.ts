import type { NewsSourceConfig } from "./types.ts"

/** Return listing page URLs in the order they should be attempted for a source. */
export function getSourceListingPageUrls(
  /** The source configuration with primary and fallback listing pages. */
  sourceConfig: NewsSourceConfig,
): string[] {
  const fallbackUrls = sourceConfig.fallbackUrls ?? []

  return sourceConfig.preferFallbackUrls
    ? [...fallbackUrls, sourceConfig.homepageUrl]
    : [sourceConfig.homepageUrl, ...fallbackUrls]
}
