import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "vitest"
import { writeTextAtomically } from "../atomicWrite.ts"

test("publishes and replaces complete UTF-8 artifacts on the host filesystem", () => {
  const root = mkdtempSync(join(tmpdir(), "briefing-atomic-"))
  try {
    const file = join(root, "nested", "artifact.json")
    writeTextAtomically(file, "First café\n")
    expect(readFileSync(file, "utf8")).toBe("First café\n")
    writeTextAtomically(file, "Second café\n")
    expect(readFileSync(file, "utf8")).toBe("Second café\n")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
