import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { expect, test, vi } from "vitest"
import { runCodexAgent } from "../../morning-briefing/codexAgent.ts"
import { loadGoogleTasks } from "../loadGoogleTasks.ts"
import { runGoogleTasks } from "../runGoogleTasks.ts"
import { researchQueue } from "../researchQueue.ts"

const paths = vi.hoisted(() => ({
  root: `/tmp/inbox-research-test-${Date.now()}-${Math.random()}`,
}))
vi.mock("../constants.ts", () => ({
  INBOX_STATE_PATH: `${paths.root}/state`,
  VAULT_PATH: `${paths.root}/vault`,
}))
vi.mock("../../morning-briefing/codexAgent.ts", () => ({ runCodexAgent: vi.fn() }))
vi.mock("../loadGoogleTasks.ts", () => ({ loadGoogleTasks: vi.fn() }))
vi.mock("../runGoogleTasks.ts", () => ({ runGoogleTasks: vi.fn() }))

test("publishes verified research to the task's new list and retries task updates without repeating research", async () => {
  const state = join(paths.root, "state")
  const vault = join(paths.root, "vault")
  mkdirSync(join(state, "captures"), { recursive: true })
  mkdirSync(vault, { recursive: true })
  writeFileSync(
    join(state, "captures/hash.json"),
    JSON.stringify({
      capture: { id: "hash", timestamp: "2026-09-05T10:00:00+02:00", raw: "Research renewal" },
      draft: {
        title: "Renew card",
        research: "Find renewal requirements",
        question: "",
        duplicate: null,
      },
      target: {
        id: "task",
        listId: "inbox",
        title: "Renew card",
        url: "https://tasks.google.com/task/task",
      },
      date: "2026-09-05",
    }),
  )
  let listId = "inbox"
  let notes = "Preserve this context."
  const children: {
    id: string
    title: string
    parent: string
    position: string
    status?: string
  }[] = []
  vi.mocked(loadGoogleTasks).mockImplementation(async () => ({
    lists: [],
    tasks: [{ id: "task", listId, title: "Renew card", notes, status: "needsAction" }],
  }))
  vi.mocked(runCodexAgent).mockImplementation(async args => {
    mkdirSync(join(state, "research"), { recursive: true })
    writeFileSync(join(vault, "Residence renewal.md"), "Verified findings and sources.")
    writeFileSync(
      args.outputPath,
      JSON.stringify({
        notePath: "Residence renewal.md",
        nextSteps: ["Review requirements", "Book appointment"],
        question: "Which card do you hold?",
      }),
    )
    listId = "today"
  })
  let loseInsertResponse = true
  vi.mocked(runGoogleTasks).mockImplementation(async (command, request) => {
    expect(request.params?.tasklist).toBe("today")
    if (command[2] === "patch") notes = request.body!.notes!
    if (command[2] === "list") {
      expect(request.params).toMatchObject({ showCompleted: true, showHidden: true })
      return { items: children }
    }
    if (command[2] === "insert") {
      expect(request.params?.parent).toBe("task")
      expect(request.params?.previous).toBe(children.at(-1)?.id)
      const child = {
        id: `child-${children.length}`,
        title: request.body!.title!,
        parent: "task",
        position: String(children.length),
      }
      children.push(child)
      if (loseInsertResponse) {
        loseInsertResponse = false
        throw new Error("Insert succeeded but response was lost")
      }
      return child
    }
    if (command[2] === "get" && request.params?.task !== "task")
      return children.find(child => child.id === request.params?.task)
    return { id: "task", notes }
  })
  await expect(researchQueue()).rejects.toThrow("need retry")
  expect(existsSync(join(state, "research/hash.json.done"))).toBe(false)
  // A completed step must not be recreated when publication resumes.
  expect(children).toHaveLength(1)
  children[0]!.status = "completed"
  await researchQueue()
  expect(runCodexAgent).toHaveBeenCalledTimes(1)
  expect(notes).toContain("Preserve this context.")
  expect(notes).toContain("obsidian://open?vault=")
  expect(notes).toContain("file=Residence%20renewal")
  expect(children.map(child => child.title)).toEqual(["Review requirements", "Book appointment"])
  expect(readFileSync(join(state, "research/hash.json.done"), "utf8")).toBeTruthy()
})

test("retries research when its promised Obsidian note is missing", async () => {
  const state = join(paths.root, "state")
  const record = JSON.parse(readFileSync(join(state, "captures/hash.json"), "utf8"))
  record.capture.id = "missing"
  writeFileSync(join(state, "captures/missing.json"), JSON.stringify(record))
  vi.mocked(runCodexAgent)
    .mockClear()
    .mockImplementation(async args => {
      writeFileSync(
        args.outputPath,
        JSON.stringify({ notePath: "Missing.md", nextSteps: [], question: "" }),
      )
    })
  await expect(researchQueue()).rejects.toThrow("need retry")
  vi.mocked(runCodexAgent).mockImplementation(async args => {
    writeFileSync(join(paths.root, "vault/Missing.md"), "Recovered findings.")
    writeFileSync(
      args.outputPath,
      JSON.stringify({ notePath: "Missing.md", nextSteps: [], question: "" }),
    )
  })
  await researchQueue()
  expect(runCodexAgent).toHaveBeenCalledTimes(2)
})
