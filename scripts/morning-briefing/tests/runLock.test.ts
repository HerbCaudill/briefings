import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, test } from "vitest"

import { acquireMorningBriefingRunLock } from "../runLock.ts"

describe("acquireMorningBriefingRunLock", () => {
  test("replaces an empty lock left by a crash and releases its own lock", () => {
    const directoryPath = mkdtempSync(join(tmpdir(), "morning-lock-"))
    const lockPath = join(directoryPath, "run.lock")
    writeFileSync(lockPath, "")

    const release = acquireMorningBriefingRunLock(lockPath)
    const lock = JSON.parse(readFileSync(lockPath, "utf8")) as { pid: number }

    expect(lock.pid).toBe(process.pid)
    release()
    expect(existsSync(lockPath)).toBe(false)
  })
})
