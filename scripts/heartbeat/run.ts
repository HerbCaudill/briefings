import { execFile, spawn } from "node:child_process"
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { promisify } from "node:util"

import { runCodexAgent } from "../morning-briefing/codexAgent.ts"
import { CODEX_COMMAND_PATH, MORNING_BRIEFING_MODEL } from "../morning-briefing/constants.ts"
import { acquireMorningBriefingRunLock } from "../morning-briefing/runLock.ts"
import { findBriefingThread, getE2eHealth, shouldNotifyHerb } from "./heartbeat.ts"

const exec = promisify(execFile)

const E2E_PROJECT_ID = "c09ff75a-2326-4d11-97ad-2603a263828b"
const LEO_PROJECT_ID = "mcp:4efda691-8e1e-47a1-80e5-dea589320403"
const E2E_REPOSITORY_PATH = join(homedir(), "Code/DevResults/e2e")
const REPOSITORY_PATH = resolve(import.meta.dirname, "../..")
const LOG_DIRECTORY_PATH = join(homedir(), "Code/herbcaudill/notes/leo/log")
const STATE_DIRECTORY_PATH = join(homedir(), ".local/state/leo")
const STATE_PATH = join(STATE_DIRECTORY_PATH, "heartbeat.json")
const T3_COMMAND_PATH = join(homedir(), ".t3/bin/t3.cmd")
const AGENT_TIMEOUT_MS = 20 * 60 * 1_000

/** Run t3.cmd through cmd.exe, which Windows requires for batch files. */
function runT3(
  /** CLI arguments. */
  args: string[],
  /** Optional stdin text. */
  input?: string,
): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("cmd.exe", ["/d", "/c", T3_COMMAND_PATH, ...args], { windowsHide: true })
    let output = ""
    let errorOutput = ""
    child.stdout.on("data", chunk => (output += chunk))
    child.stderr.on("data", chunk => (errorOutput += chunk))
    child.on("error", reject)
    child.on("close", code =>
      code === 0 ? resolvePromise(output) : reject(new Error(`t3 exited ${code}: ${errorOutput}`)),
    )
    child.stdin.end(input)
  })
}

/** List one project's threads. */
async function listThreads(projectId: string): Promise<T3Thread[]> {
  return JSON.parse(await runT3(["thread", "list", "--project", projectId, "--json"]))
}

/** Fetch e2e and count commits on origin/main in the last hour. */
async function countRecentCommits(): Promise<number> {
  await exec("git", ["-C", E2E_REPOSITORY_PATH, "fetch", "origin", "--quiet"])
  const { stdout } = await exec("git", [
    "-C",
    E2E_REPOSITORY_PATH,
    "rev-list",
    "--count",
    "--since=60 minutes ago",
    "origin/main",
  ])
  return Number(stdout.trim())
}

/** Append an entry to Leo's journal for the day. */
function writeJournal(date: string, text: string): void {
  mkdirSync(LOG_DIRECTORY_PATH, { recursive: true })
  const time = new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/Madrid", hour12: false })
  appendFileSync(join(LOG_DIRECTORY_PATH, `${date}.md`), `- ${time.slice(0, 5)} ${text}\n`)
}

/** Read the blockers Herb has already been told about. */
function readState(): HeartbeatState {
  return existsSync(STATE_PATH)
    ? JSON.parse(readFileSync(STATE_PATH, "utf8"))
    : { notifiedBlockerKeys: [] }
}

/** Ask Codex why e2e stopped, restarting clear work where it can. */
async function investigate(evidence: string): Promise<HeartbeatResult> {
  const outputPath = join(STATE_DIRECTORY_PATH, "last-result.json")
  await runCodexAgent({
    codexCommand: CODEX_COMMAND_PATH,
    cwd: REPOSITORY_PATH,
    environment: process.env,
    eventsPath: join(STATE_DIRECTORY_PATH, "last-events.jsonl"),
    model: MORNING_BRIEFING_MODEL,
    outputPath,
    prompt: `${readFileSync(join(import.meta.dirname, "heartbeat.prompt.md"), "utf8")}\n\nEvidence: ${evidence}\n`,
    schemaPath: join(import.meta.dirname, "heartbeat.schema.json"),
    threadSource: "heartbeat",
    timeoutMs: AGENT_TIMEOUT_MS,
  })
  return JSON.parse(readFileSync(outputPath, "utf8"))
}

/** Tell Herb in today's briefing thread, returning false when there isn't one yet. */
async function notifyHerb(date: string, summary: string): Promise<boolean> {
  const thread = findBriefingThread({ threads: await listThreads(LEO_PROJECT_ID), date })
  if (!thread) return false
  await runT3(
    ["thread", "send", thread.threadId, "-", "--json"],
    `Leo's heartbeat needs Herb. Repeat this to him as written, and take no other action:\n\n${summary}`,
  )
  return true
}

/** Run one heartbeat. Only a blocker that needs Herb touches a T3 session. */
async function main(): Promise<void> {
  mkdirSync(dirname(STATE_PATH), { recursive: true })
  const release = acquireMorningBriefingRunLock(join(STATE_DIRECTORY_PATH, "heartbeat.lock"))
  try {
    const date = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" })
    const threads = await listThreads(E2E_PROJECT_ID)
    const commitsLastHour = await countRecentCommits()
    const state = readState()

    if (getE2eHealth({ threads, commitsLastHour }) === "active") {
      writeFileSync(STATE_PATH, JSON.stringify({ notifiedBlockerKeys: [] }))
      console.log(`${new Date().toISOString()} e2e active: ${commitsLastHour} commits`)
      return
    }

    const running = threads.filter(thread => thread.status === "running").length
    const result = await investigate(
      `${running} running threads and ${commitsLastHour} commits on origin/main in the last hour.`,
    )
    writeJournal(date, `e2e ${result.outcome}: ${result.summary}`)

    if (result.outcome !== "needs_herb") {
      writeFileSync(STATE_PATH, JSON.stringify({ notifiedBlockerKeys: [] }))
      return
    }

    const blockerKey = result.blockerKey ?? result.summary
    if (!shouldNotifyHerb({ blockerKey, notifiedBlockerKeys: state.notifiedBlockerKeys })) return
    // Before today's briefing exists the blocker stays unrecorded, so a later run reports it.
    if (await notifyHerb(date, result.summary)) {
      writeFileSync(
        STATE_PATH,
        JSON.stringify({ notifiedBlockerKeys: [...state.notifiedBlockerKeys, blockerKey] }),
      )
    }
  } finally {
    release()
  }
}

await main()

type T3Thread = {
  threadId: string
  title: string
  status: string
  createdAt: string
}

type HeartbeatState = {
  notifiedBlockerKeys: string[]
}

type HeartbeatResult = {
  outcome: "healthy" | "restarted" | "needs_herb"
  summary: string
  blockerKey: string | null
}
