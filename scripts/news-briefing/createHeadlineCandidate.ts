import { isHttpArticleUrl } from "./isHttpArticleUrl.ts"
import type { CreateHeadlineCandidateArgs, HeadlineCandidate } from "./types.ts"

/** Create a headline candidate from a headline and href when the URL is article-like. */
export function createHeadlineCandidate(
  /** The candidate construction arguments. */
  args: CreateHeadlineCandidateArgs,
): HeadlineCandidate | null {
  const articleUrl = new URL(args.href, args.baseUrl)

  if (!isHttpArticleUrl(articleUrl)) {
    return null
  }

  return {
    ...(args.body ? { body: args.body } : {}),
    headline: args.headline,
    position: args.position,
    url: articleUrl.toString(),
  }
}
