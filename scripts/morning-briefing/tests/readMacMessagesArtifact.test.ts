import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { expect, test } from "vitest"
import { readMacMessagesArtifact } from "../readMacMessagesArtifact.ts"

test("keeps old Mac conversations and identifies their export as stale", () => {
  const root = mkdtempSync(join(tmpdir(), "mac-messages-"))
  try {
    const path = join(root, "messages.json")
    writeFileSync(
      path,
      JSON.stringify({
        version: 1,
        exportedAt: "2026-10-21T07:00:00Z",
        source: {
          source: "Apple Messages",
          status: "complete",
          conversations: [{ name: "Test", transcript: "A retained message" }],
        },
      }),
    )
    expect(readMacMessagesArtifact(path, new Date("2026-10-22T07:00:00Z"))).toMatchObject({
      source: "Apple Messages",
      status: "stale",
      exportedAt: "2026-10-21T07:00:00Z",
      conversations: [{ name: "Test", transcript: "A retained message" }],
    })
    expect(readMacMessagesArtifact(path, new Date("2026-10-21T07:30:00Z"))).toMatchObject({
      status: "complete",
    })
    writeFileSync(path, '{"version":1,"exportedAt":"bad","source":{"conversations":"bad"}}')
    expect(readMacMessagesArtifact(path).status).toBe("unavailable")
    expect(readMacMessagesArtifact(join(root, "missing.json")).status).toBe("unavailable")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
