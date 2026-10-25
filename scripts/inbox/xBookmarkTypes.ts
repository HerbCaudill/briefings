/** Retained API post fields, including unknown fields from future responses. */
export type XPost = {
  /** Stable tweet identifier. */
  id: string
  /** Short post text. */
  text: string
  /** Author expansion identity. */
  author_id?: string
  /** Original publication timestamp, not the bookmark time. */
  created_at?: string
  /** Untruncated long text and its own URL entities. */
  note_tweet?: { text: string; entities?: XEntities }
  /** Expanded URLs in short text. */
  entities?: XEntities
  /** Attached media identities. */
  attachments?: { media_keys?: string[] }
  /** Quoted, replied-to, or reposted posts. */
  referenced_tweets?: { id: string; type: string }[]
  /** Preserve all requested API metadata in the archive. */
  [key: string]: unknown
}

/** URL entities shared by short and long post text. */
type XEntities = {
  /** Source and destination URLs, with optional media identity. */
  urls?: { url: string; expanded_url: string; media_key?: string }[]
}

/** Archive compatible with the original one-off export. */
export type XBookmarks = {
  /** Posts in bookmark order, followed by retained history. */
  data: XPost[]
  /** Associated API expansions. */
  includes?: {
    /** Authors, preserved with all returned fields. */
    users?: { id: string; name: string; username: string; [key: string]: unknown }[]
    /** Referenced posts. */
    tweets?: XPost[]
    /** Photo, video, and alt-text metadata. */
    media?: {
      media_key: string
      type: string
      url?: string
      preview_image_url?: string
      alt_text?: string
      [key: string]: unknown
    }[]
  }
  /** Time the most recent full fetch completed. */
  exportedAt?: string
  /** Preserve original export metadata. */
  [key: string]: unknown
}
