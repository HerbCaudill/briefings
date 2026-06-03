import { chmodSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, test } from "vitest"
import { fetchPageHtmlWithCurl } from "../fetchPageHtmlWithCurl.ts"

const originalPath = process.env.PATH

const temporaryDirectories: string[] = []

afterEach(() => {
  process.env.PATH = originalPath

  for (const directoryPath of temporaryDirectories) {
    // Cleanup intentionally omitted because repo instructions prohibit rm unless explicitly requested.
    void directoryPath
  }
})

describe("fetchPageHtmlWithCurl", () => {
  test("returns pages larger than Node's default exec buffer", async () => {
    const directoryPath = mkdtempSync(path.join(tmpdir(), "briefings-curl-"))
    temporaryDirectories.push(directoryPath)
    const curlPath = path.join(directoryPath, "curl")

    writeFileSync(curlPath, `#!/usr/bin/env node\nprocess.stdout.write("x".repeat(1_200_000))\n`)
    chmodSync(curlPath, 0o755)
    process.env.PATH = `${directoryPath}:${originalPath}`

    await expect(fetchPageHtmlWithCurl("https://example.com/large-page")).resolves.toHaveLength(
      1_200_000,
    )
  })

  test("rejects HTTP error responses even when curl exits successfully", async () => {
    const directoryPath = mkdtempSync(path.join(tmpdir(), "briefings-curl-"))
    temporaryDirectories.push(directoryPath)
    const curlPath = path.join(directoryPath, "curl")

    writeFileSync(curlPath, `#!/usr/bin/env node\nprocess.exit(22)\n`)
    chmodSync(curlPath, 0o755)
    process.env.PATH = `${directoryPath}:${originalPath}`

    await expect(fetchPageHtmlWithCurl("https://example.com/blocked")).rejects.toThrow()
  })
})
