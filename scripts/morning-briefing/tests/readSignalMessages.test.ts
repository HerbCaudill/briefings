import { existsSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test, vi } from "vitest"

import { readSignalMessages } from "../readSignalMessages.ts"

describe("readSignalMessages", () => {
  test("pipes the Keychain key to sigtop and returns its transcripts", async () => {
    let exportDirectory = ""
    const run = vi.fn(async (command: string, args: readonly string[]) => {
      if (command === "/usr/bin/security") return { code: 0, stdout: "secret-key\n", stderr: "" }
      exportDirectory = args.at(-1)!
      writeFileSync(
        join(exportDirectory, "Jamie Folsom.txt"),
        "2026-10-06 09:00 Jamie Folsom: Call?\n",
      )
      writeFileSync(join(exportDirectory, "Quiet group.txt"), "")
      return { code: 0, stdout: "", stderr: "" }
    })

    expect(
      await readSignalMessages({
        run,
        since: new Date("2026-10-05T00:00:00+02:00"),
        timeZone: "Europe/Madrid",
      }),
    ).toEqual({
      source: "Signal",
      status: "complete",
      conversations: [{ name: "Jamie Folsom", transcript: "2026-10-06 09:00 Jamie Folsom: Call?" }],
    })
    expect(run).toHaveBeenLastCalledWith(
      "sigtop",
      [
        "export-messages",
        "-f",
        "text-short",
        "-k",
        "macos:-",
        "-s",
        "2026-10-05T00:00,",
        exportDirectory,
      ],
      expect.objectContaining({ input: "secret-key\n" }),
    )
    // Message text must not outlive the read.
    expect(existsSync(exportDirectory)).toBe(false)
  })

  test("reports a Keychain refusal without running sigtop", async () => {
    const run = vi
      .fn()
      .mockResolvedValue({ code: 51, stdout: "", stderr: "User interaction is not allowed." })

    const result = await readSignalMessages({
      run,
      since: new Date("2026-10-05T00:00:00+02:00"),
      timeZone: "Europe/Madrid",
    })

    expect(result).toMatchObject({ source: "Signal", status: "unavailable", conversations: [] })
    expect(result.reason).toContain("Always Allow")
    expect(run).toHaveBeenCalledTimes(1)
  })
})
