import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { mergeXBookmarks } from "./mergeXBookmarks.ts"
import type { XBookmarks } from "./xBookmarkTypes.ts"

/** Read at most 800 bookmarks through the mini's existing OAuth app; never authenticate. */
export async function fetchXBookmarks(
  /** Injectable GET boundary for paginated API responses. */
  get: (path: string) => Promise<unknown> = getWithXurl,
): Promise<XBookmarks> {
  let result: XBookmarks = { data: [] }
  let token: string | undefined
  const tokens = new Set<string>()
  for (let pageNumber = 0; pageNumber < 800 && result.data.length < 800; pageNumber++) {
    const params = new URLSearchParams({
      ...queryFields,
      max_results: String(Math.min(100, 800 - result.data.length)),
    })
    if (token) params.set("pagination_token", token)
    const page = (await get(`/2/users/16202589/bookmarks?${params}`)) as XPage
    const fatalErrors = page?.errors?.filter(
      error =>
        error.type !== "https://api.x.com/2/problems/resource-not-found" ||
        ![
          "referenced_tweets.id",
          "referenced_tweets.id.author_id",
          "author_id",
          "attachments.media_keys",
        ].includes(error.parameter ?? ""),
    )
    if (
      !page ||
      fatalErrors?.length ||
      (page.status && page.status >= 400) ||
      (!Array.isArray(page.data) && page.meta?.result_count !== 0) ||
      (page.data ?? []).some(
        post => typeof post.id !== "string" || !post.id || typeof post.text !== "string",
      )
    )
      throw new Error(
        `Invalid X bookmarks response on page ${pageNumber + 1}${page?.status ? ` (status ${page.status})` : ""}`,
      )
    result = mergeXBookmarks(result, { data: page.data ?? [], includes: page.includes })
    result.data = result.data.slice(0, 800)
    token = page.meta?.next_token
    if (!token) break
    if (tokens.has(token)) throw new Error("Repeated X bookmarks pagination token")
    tokens.add(token)
  }
  return { ...result, exportedAt: new Date().toISOString() }
}

/** Invoke only GET using the already signed-in bookmarks app, with a bounded timeout. */
async function getWithXurl(path: string): Promise<unknown> {
  const { stdout } = await promisify(execFile)("xurl", ["--app", "bookmarks", path], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 60_000,
  })
  return JSON.parse(stdout)
}

/** Working fields from the mini's original bookmark export. */
const queryFields = {
  "tweet.fields":
    "created_at,author_id,entities,public_metrics,note_tweet,article,referenced_tweets,attachments,conversation_id,lang",
  expansions:
    "author_id,attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id",
  "user.fields": "username,name,description,profile_image_url",
  "media.fields": "url,preview_image_url,type,alt_text,width,height",
}

/** Pagination and failure fields used at the API boundary. */
type XPage = Partial<XBookmarks> & {
  /** Problem response status. */
  status?: number
  /** Partial or complete API failures must be retried. */
  errors?: { type?: string; parameter?: string }[]
  /** Pagination metadata. */
  meta?: { next_token?: string; result_count?: number }
}
