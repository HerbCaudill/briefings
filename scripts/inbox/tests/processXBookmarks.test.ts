import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, vi } from "vitest"
import { processXBookmarks } from "../processXBookmarks.ts"
import * as atomic from "../../morning-briefing/atomicWrite.ts"

/** Isolate the baseline, note, and private journals. */
function setup() {
  const root = mkdtempSync(join(tmpdir(), "x-bookmarks-"))
  const jsonPath = join(root, "bookmarks.json")
  writeFileSync(jsonPath, JSON.stringify({ data: [{ id: "old", text: "Baseline" }], includes: {} }))
  return {
    jsonPath,
    markdownPath: join(root, "X bookmarks.md"),
    statePath: join(root, "state"),
    date: "2026-10-25",
    classify: vi.fn(async () => ({
      title: "Try tool",
      question: "",
      research: "",
      duplicate: null,
      disposition: "task" as const,
    })),
    transfer: vi.fn(async () => ({
      id: "task",
      kind: "task" as const,
      spaceId: "space",
      title: "Try tool",
      url: "https://tasks/?task=task",
    })),
  }
}

test("baselines only the original export and archives every new bookmark before routing", async () => {
  const args = setup()
  const fetch = vi.fn(async () => ({
    data: [
      {
        id: "new",
        text: "truncated",
        note_tweet: {
          text: "Try this tool https://t.co/link",
          entities: {
            urls: [{ url: "https://t.co/link", expanded_url: "https://example.com/tool" }],
          },
        },
      },
    ],
    includes: {},
  }))
  await processXBookmarks({ ...args, fetch })
  expect(args.classify).toHaveBeenCalledTimes(1)
  expect(args.classify.mock.calls[0]).toEqual([
    expect.objectContaining({
      id: "x-new",
      raw: expect.stringContaining("https://example.com/tool"),
      source: { kind: "x", url: "https://x.com/i/status/new" },
    }),
  ])
  expect(readFileSync(args.markdownPath, "utf8")).toContain("Baseline")
  expect(JSON.parse(readFileSync(args.jsonPath, "utf8")).data).toHaveLength(2)
  await processXBookmarks({ ...args, fetch })
  expect(args.transfer).toHaveBeenCalledTimes(1)
})

test("retries pending transfers with their persisted classification even if X is unavailable", async () => {
  const args = setup()
  args.transfer.mockRejectedValueOnce(new Error("verification failed"))
  const fetch = async () => ({ data: [{ id: "new", text: "Try tool" }], includes: {} })
  await expect(processXBookmarks({ ...args, fetch })).rejects.toThrow("verification failed")
  expect(readFileSync(args.markdownPath, "utf8")).toContain("Try tool")
  await expect(
    processXBookmarks({
      ...args,
      fetch: async () => {
        throw new Error("X offline")
      },
    }),
  ).rejects.toThrow("X offline")
  expect(args.transfer).toHaveBeenCalledTimes(2)
  expect(args.classify).toHaveBeenCalledTimes(1)
  await processXBookmarks({ ...args, fetch })
  expect(args.transfer).toHaveBeenCalledTimes(2)
})

test("archives nonactionable bookmarks without creating tasks and continues past failed items", async () => {
  const args = setup()
  const classify = vi
    .fn()
    .mockRejectedValueOnce(new Error("classifier unavailable"))
    .mockResolvedValue({
      title: "A joke",
      question: "",
      research: "",
      duplicate: null,
      disposition: "archive",
    })
  const fetch = async () => ({
    data: [
      { id: "first", text: "one" },
      { id: "second", text: "two" },
    ],
    includes: {},
  })
  await expect(processXBookmarks({ ...args, classify, fetch })).rejects.toThrow(
    "classifier unavailable",
  )
  await processXBookmarks({ ...args, classify, fetch })
  expect(classify).toHaveBeenCalledTimes(3)
  expect(args.transfer).not.toHaveBeenCalled()
})

test("recovers an acknowledged task after a lost description reply without reclassifying", async () => {
  const args = setup()
  const destination = {
    id: "task",
    kind: "task" as const,
    spaceId: "space",
    title: "Try tool",
    url: "https://tasks/?task=task",
  }
  const transfer = vi
    .fn()
    .mockImplementationOnce(async (_capture, _draft, recovery) => {
      recovery.checkpoint(destination)
      throw new Error("description reply lost")
    })
    .mockResolvedValue(destination)
  const fetch = async () => ({ data: [{ id: "new", text: "Try tool" }], includes: {} })
  await expect(processXBookmarks({ ...args, transfer, fetch })).rejects.toThrow(
    "description reply lost",
  )
  await processXBookmarks({ ...args, transfer, fetch })
  expect(transfer.mock.calls[1][2]).toMatchObject({
    candidate: destination,
    insertionAttempted: true,
  })
  expect(args.classify).toHaveBeenCalledTimes(1)
})

test("keeps quoted posts, media, and Article metadata in the note", async () => {
  const args = setup()
  await processXBookmarks({
    ...args,
    fetch: async () => ({
      data: [
        {
          id: "new",
          text: "An essay",
          article: { id: "article", title: "Article title" },
          referenced_tweets: [{ id: "quote", type: "quoted" }],
          attachments: { media_keys: ["photo"] },
        },
      ],
      includes: {
        tweets: [{ id: "quote", text: "Original insight", author_id: "author" }],
        users: [{ id: "author", username: "author", name: "Author Name" }],
        media: [
          {
            media_key: "photo",
            type: "photo",
            url: "https://example.com/photo",
            alt_text: "A diagram",
          },
        ],
      },
    }),
  })
  const markdown = readFileSync(args.markdownPath, "utf8")
  expect(markdown).toContain("Article title")
  expect(markdown).toContain("Original insight")
  expect(markdown).toContain("Author Name")
  expect(markdown).toContain("https://example.com/photo")
  expect(markdown).toContain("A diagram")
})

test("queues long reads in the shared research journal without creating a reading task", async () => {
  const args = setup()
  await processXBookmarks({
    ...args,
    classify: async () => ({
      disposition: "research",
      title: "Read essay",
      research: "Read https://example.com/essay and summarize",
      question: "",
      duplicate: null,
    }),
    fetch: async () => ({
      data: [{ id: "essay", text: "Essay https://example.com/essay" }],
      includes: {},
    }),
  })
  const record = JSON.parse(readFileSync(join(args.statePath, "captures/x-essay.json"), "utf8"))
  expect(record.draft).toMatchObject({
    disposition: "research",
    research: expect.stringContaining("https://example.com/essay"),
  })
  expect(record.target).toBeUndefined()
  expect(args.transfer).not.toHaveBeenCalled()
})

test("does not route newly fetched content until the JSON cache is durable", async () => {
  const args = setup()
  const write = atomic.writeTextAtomically
  const mock = vi.spyOn(atomic, "writeTextAtomically").mockImplementation((path, contents) => {
    if (path === args.jsonPath) throw new Error("cache write failed")
    write(path, contents)
  })
  try {
    await expect(
      processXBookmarks({
        ...args,
        fetch: async () => ({ data: [{ id: "new", text: "Try tool" }] }),
      }),
    ).rejects.toThrow("cache write failed")
    expect(args.transfer).not.toHaveBeenCalled()
    expect(args.classify).not.toHaveBeenCalled()
  } finally {
    mock.mockRestore()
  }
})
