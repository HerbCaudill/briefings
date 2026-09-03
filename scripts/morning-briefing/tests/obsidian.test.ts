import { describe, expect, test } from "vitest"

import { syncMorningBriefingToObsidian } from "../obsidian.ts"

describe("syncMorningBriefingToObsidian", () => {
  test("retries startup and waits until the vault reports synced", async () => {
    const commands: string[][] = []
    const statuses = ["status: syncing", "status: synced"]
    let opened = false
    let startAttempts = 0

    await syncMorningBriefingToObsidian({
      maxStatusChecks: 2,
      openObsidian: async () => {
        opened = true
      },
      runObsidian: async arguments_ => {
        commands.push(arguments_)
        if (arguments_[1] === "sync" && startAttempts++ === 0)
          throw new Error("Obsidian is still opening")
        return arguments_[1] === "sync:status" ? (statuses.shift() ?? "") : ""
      },
      wait: async () => undefined,
    })

    expect(opened).toBe(true)
    expect(commands).toEqual([
      ["vault=notes", "sync", "on"],
      ["vault=notes", "sync", "on"],
      ["vault=notes", "sync:status"],
      ["vault=notes", "sync:status"],
    ])
  })
})
