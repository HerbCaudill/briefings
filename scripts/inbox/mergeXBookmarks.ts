import type { XBookmarks } from "./xBookmarkTypes.ts"

/** Merge current results with history without dropping bookmarks outside the API window. */
export function mergeXBookmarks(current: XBookmarks, previous: XBookmarks): XBookmarks {
  return {
    ...previous,
    ...current,
    data: unique(current.data, previous.data, post => post.id),
    includes: {
      users: unique(current.includes?.users ?? [], previous.includes?.users ?? [], user => user.id),
      tweets: unique(
        current.includes?.tweets ?? [],
        previous.includes?.tweets ?? [],
        post => post.id,
      ),
      media: unique(
        current.includes?.media ?? [],
        previous.includes?.media ?? [],
        media => media.media_key,
      ),
    },
  }
}

/** Keep the first copy so fresh fields win over cached fields. */
function unique<T>(current: T[], previous: T[], key: (item: T) => string): T[] {
  const entries = new Map<string, T>()
  for (const item of [...current, ...previous])
    if (!entries.has(key(item))) entries.set(key(item), item)
  return [...entries.values()]
}
