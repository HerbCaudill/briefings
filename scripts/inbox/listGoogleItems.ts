import type { GwsRequest, GwsRunner } from "./types.ts"

/** Read every page so duplicate detection includes tasks beyond the first page. */
export async function listGoogleItems<T>(
  run: GwsRunner,
  command: string[],
  params: GwsRequest["params"] = {},
): Promise<T[]> {
  const items: T[] = []
  let pageToken: string | undefined
  do {
    const page = (await run(command, {
      params: { ...params, maxResults: 100, ...(pageToken ? { pageToken } : {}) },
    })) as { items?: T[]; nextPageToken?: string }
    items.push(...(page.items ?? []))
    pageToken = page.nextPageToken
  } while (pageToken)
  return items
}
