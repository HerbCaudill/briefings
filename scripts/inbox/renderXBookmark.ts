import type { XBookmarks, XPost } from "./xBookmarkTypes.ts"

/** Render one archived bookmark with long text, expanded URLs, quotes, and media. */
export function renderXBookmark(post: XPost, archive: XBookmarks): string {
  const user = archive.includes?.users?.find(user => user.id === post.author_id)
  const byline = user ? `${user.name} (@${user.username})` : "Unknown author"
  const text = post.note_tweet?.text ?? post.text
  const entities = post.note_tweet?.entities?.urls ?? post.entities?.urls ?? []
  const expanded = entities
    .reduce((body, url) => body.replaceAll(url.url, url.media_key ? "" : url.expanded_url), text)
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .trim()
  const media = (post.attachments?.media_keys ?? []).flatMap(key => {
    const item = archive.includes?.media?.find(item => item.media_key === key)
    return item
      ? [
          `- ${item.type}: ${item.url ?? item.preview_image_url ?? ""}${item.alt_text ? ` – ${item.alt_text}` : ""}`,
        ]
      : []
  })
  const references = (post.referenced_tweets ?? []).flatMap(ref => {
    const quoted = archive.includes?.tweets?.find(tweet => tweet.id === ref.id)
    if (!quoted) return []
    // Render one reference level to avoid cycles in conversation expansions.
    const body = renderXBookmark({ ...quoted, referenced_tweets: [] }, archive)
    return [
      `${ref.type}:\n\n${body
        .split("\n")
        .map(line => `> ${line}`)
        .join("\n")}`,
    ]
  })
  return [
    `## ${byline}${post.created_at ? ` – ${post.created_at.slice(0, 10)}` : ""}`,
    `[View on X](https://x.com/i/status/${post.id})`,
    expanded,
    ...(post.article ? [`X Article: ${JSON.stringify(post.article)}`] : []),
    ...media,
    ...references,
  ].join("\n\n")
}
