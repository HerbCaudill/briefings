import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, expect, test } from "vitest"
import { commitAndPushGeneratedBriefings } from "../commitAndPushGeneratedBriefings.ts"

describe("commitAndPushGeneratedBriefings", () => {
  test("adds generated briefing files, commits them, rebases, and pushes", async () => {
    const commands: Array<{ args: string[]; command: string }> = []

    await commitAndPushGeneratedBriefings({
      dates: ["2026-04-18", "2026-04-20"],
      runCommand: async (command, args) => {
        commands.push({ args, command })
        return ""
      },
    })

    expect(commands).toEqual([
      {
        command: "git",
        args: [
          "add",
          "public/briefings/index.json",
          "public/briefings/2026-04-18.json",
          "public/briefings/raw/2026-04-18.json",
          "public/briefings/raw/2026-04-18-selection.json",
          "public/briefings/2026-04-20.json",
          "public/briefings/raw/2026-04-20.json",
          "public/briefings/raw/2026-04-20-selection.json",
        ],
      },
      {
        command: "git",
        args: ["commit", "-m", "Briefing: add generated briefings for 2026-04-18, 2026-04-20"],
      },
      { command: "git", args: ["pull", "--rebase"] },
      { command: "git", args: ["push"] },
    ])
  })

  test("updates the briefing index before staging generated files", async () => {
    const briefingDirectoryPath = mkdtempSync(path.join(tmpdir(), "briefings-"))
    const commands: Array<{ args: string[]; command: string; indexJson: string }> = []

    writeFileSync(path.join(briefingDirectoryPath, "2026-04-18.json"), "{}\n")
    writeFileSync(path.join(briefingDirectoryPath, "2026-04-17.json"), "{}\n")
    writeFileSync(path.join(briefingDirectoryPath, "index.json"), "[]\n")

    await commitAndPushGeneratedBriefings({
      briefingDirectoryPath,
      dates: ["2026-04-18"],
      runCommand: async (command, args) => {
        commands.push({
          args,
          command,
          indexJson: readFileSync(path.join(briefingDirectoryPath, "index.json"), "utf8"),
        })
        return ""
      },
    })

    expect(commands[0]?.indexJson).toBe(
      JSON.stringify(
        [
          { date: "2026-04-18", title: "Daily Briefing — Saturday, April 18, 2026" },
          { date: "2026-04-17", title: "Daily Briefing — Friday, April 17, 2026" },
        ],
        null,
        2,
      ) + "\n",
    )
  })

  test("does not run git commands when there are no generated dates", async () => {
    const commands: Array<{ args: string[]; command: string }> = []

    await commitAndPushGeneratedBriefings({
      dates: [],
      runCommand: async (command, args) => {
        commands.push({ args, command })
        return ""
      },
    })

    expect(commands).toEqual([])
  })
})
