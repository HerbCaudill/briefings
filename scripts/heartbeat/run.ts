import { spawn } from "node:child_process"
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join, resolve } from "node:path"

import { runCodexAgent } from "../morning-briefing/codexAgent.ts"
import { CODEX_COMMAND_PATH } from "../morning-briefing/constants.ts"
import { acquireMorningBriefingRunLock } from "../morning-briefing/runLock.ts"
import { findBriefingThread, hasWatchedWork, shouldNotifyHerb } from "./heartbeat.ts"

const LEO_PROJECT_ID = "mcp:4efda691-8e1e-47a1-80e5-dea589320403"
const HEARTBEAT_MODEL = "gpt-6.1-terra"
const REPOSITORY_PATH = resolve(import.meta.dirname, "../..")
const MEMORY_DIRECTORY_PATH = join(homedir(), "Code/herbcaudill/notes/leo")
const WATCHING_PATH = join(MEMORY_DIRECTORY_PATH, "Watching.md")
const LOG_DIRECTORY_PATH = join(MEMORY_DIRECTORY_PATH, "log")
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

/** Save the heartbeat's memory between runs. */
function writeState(state: HeartbeatState): void {
  writeFileSync(STATE_PATH, JSON.stringify(state))
}

/** Have Codex work through the checklist. */
async function runCheck(date: string): Promise<HeartbeatResult> {
  const outputPath = join(STATE_DIRECTORY_PATH, "last-result.json")
  await runCodexAgent({
    codexCommand: CODEX_COMMAND_PATH,
    cwd: REPOSITORY_PATH,
    environment: process.env,
    eventsPath: join(STATE_DIRECTORY_PATH, "last-events.jsonl"),
    model: HEARTBEAT_MODEL,
    outputPath,
    prompt: `${readFileSync(join(import.meta.dirname, "heartbeat.prompt.md"), "utf8")}\n\nCurrent time: ${new Date().toISOString()}. Today's journal: ${join(LOG_DIRECTORY_PATH, `${date}.md`)}\n`,
    schemaPath: join(import.meta.dirname, "heartbeat.schema.json"),
    threadSource: "heartbeat",
    timeoutMs: AGENT_TIMEOUT_MS,
  })
  return JSON.parse(readFileSync(outputPath, "utf8"))
}

/** Tell Herb in today's briefing thread, returning false when there isn't one yet. */
async function notifyHerb(date: string, summary: string): Promise<boolean> {
  const threads: BriefingThread[] = JSON.parse(
    await runT3(["thread", "list", "--project", LEO_PROJECT_ID, "--json"]),
  )
  const thread = findBriefingThread({ threads, date })
  if (!thread) return false
  await runT3(
    ["thread", "send", thread.threadId, "-", "--json"],
    `Leo's heartbeat needs Herb. Repeat this to him as written, and take no other action:\n\n${summary}`,
  )
  return true
}

/** Run one heartbeat. Only a result that needs Herb touches a T3 session. */
async function main(): Promise<void> {
  mkdirSync(STATE_DIRECTORY_PATH, { recursive: true })
  const release = acquireMorningBriefingRunLock(join(STATE_DIRECTORY_PATH, "heartbeat.lock"))
  try {
    if (!hasWatchedWork(readFileSync(WATCHING_PATH, "utf8"))) return

    const date = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" })
    const state = readState()
    const result = await runCheck(date)
    console.log(`${new Date().toISOString()} ${result.outcome}: ${result.summary}`)

    if (result.outcome === "quiet") {
      writeState({ notifiedBlockerKeys: [] })
      return
    }

    writeJournal(date, `${result.outcome}: ${result.summary}`)
    if (result.outcome === "acted") {
      writeState({ notifiedBlockerKeys: [] })
      return
    }

    const blockerKey = result.blockerKey ?? result.summary
    // Before today's briefing exists the blocker stays unrecorded, so a later run reports it.
    if (
      shouldNotifyHerb({ blockerKey, notifiedBlockerKeys: state.notifiedBlockerKeys }) &&
      (await notifyHerb(date, result.summary))
    ) {
      writeState({ notifiedBlockerKeys: [...state.notifiedBlockerKeys, blockerKey] })
    }
  } finally {
    release()
  }
}

await main()

type BriefingThread = {
  threadId: string
  title: string
  createdAt: string
}

type HeartbeatState = {
  notifiedBlockerKeys: string[]
}

type HeartbeatResult = {
  outcome: "quiet" | "acted" | "needs_herb"
  summary: string
  blockerKey: string | null
}
