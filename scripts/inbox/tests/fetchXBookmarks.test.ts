import { expect, test, vi } from "vitest"
import { fetchXBookmarks } from "../fetchXBookmarks.ts"

test("fetches all pages using the existing bookmarks app fields and preserves expansions", async () => {
  const get = vi
    .fn()
    .mockResolvedValueOnce({
      data: [{ id: "1", text: "short" }],
      meta: { next_token: "next" },
      includes: { users: [{ id: "author", name: "Author", username: "author" }] },
    })
    .mockResolvedValueOnce({
      data: [{ id: "2", text: "short", note_tweet: { text: "Long text" } }],
      includes: {
        tweets: [{ id: "quoted", text: "Quote" }],
        media: [{ media_key: "media", type: "photo" }],
      },
      meta: { result_count: 1 },
    })
  const result = await fetchXBookmarks(get)
  expect(result.data.map(post => post.id)).toEqual(["1", "2"])
  expect(result.includes?.tweets?.[0]?.id).toBe("quoted")
  expect(result.data[1]?.note_tweet?.text).toBe("Long text")
  const query = new URL(get.mock.calls[1][0], "https://api.x.com")
  expect(query.pathname).toBe("/2/users/16202589/bookmarks")
  expect(query.searchParams.get("pagination_token")).toBe("next")
  expect(query.searchParams.get("max_results")).toBe("100")
  expect(query.searchParams.get("tweet.fields")).toContain("note_tweet")
})

test("rejects API errors and malformed pages rather than accepting an empty export", async () => {
  for (const response of [
    { status: 429, title: "Too Many Requests" },
    { errors: [{ message: "Unauthorized" }] },
    {},
    { data: [{ text: "missing id" }] },
  ])
    await expect(fetchXBookmarks(async () => response)).rejects.toThrow()
})

test("keeps valid bookmarks when a referenced post has been deleted", async () => {
  const result = await fetchXBookmarks(async () => ({
    data: [
      { id: "1", text: "Useful post", referenced_tweets: [{ id: "deleted", type: "quoted" }] },
    ],
    errors: [
      {
        type: "https://api.x.com/2/problems/resource-not-found",
        parameter: "referenced_tweets.id",
        resource_id: "deleted",
      },
    ],
  }))
  expect(result.data[0]?.id).toBe("1")
})

test("stops at 800 bookmarks and rejects repeated pagination tokens", async () => {
  const get = vi.fn(async () => ({
    data: Array.from({ length: 100 }, (_, i) => ({
      id: `${get.mock.calls.length}-${i}`,
      text: "post",
    })),
    meta: { next_token: `page-${get.mock.calls.length}` },
  }))
  expect((await fetchXBookmarks(get)).data).toHaveLength(800)
  expect(get).toHaveBeenCalledTimes(8)
  await expect(
    fetchXBookmarks(async () => ({ data: [], meta: { next_token: "same" } })),
  ).rejects.toThrow("Repeated")
})

test("follows short pages until it has reached the 800-post window", async () => {
  const get = vi.fn(async () => ({
    data: Array.from({ length: get.mock.calls.length === 1 ? 50 : 100 }, (_, i) => ({
      id: `${get.mock.calls.length}-${i}`,
      text: "post",
    })),
    meta: { next_token: `page-${get.mock.calls.length}` },
  }))
  expect((await fetchXBookmarks(get)).data).toHaveLength(800)
  expect(get).toHaveBeenCalledTimes(9)
})
