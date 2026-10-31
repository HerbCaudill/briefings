import { spawn } from "node:child_process"
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { runCodexAgent } from "../morning-briefing/codexAgent.ts"
import { CODEX_COMMAND_PATH } from "../morning-briefing/constants.ts"
import { acquireMorningBriefingRunLock } from "../morning-briefing/runLock.ts"
import { findBriefingThread, hasWatchedWork, shouldNotifyHerb } from "./heartbeat.ts"

const LEO_PROJECT_ID = "mcp:4efda691-8e1e-47a1-80e5-dea589320403"
const TRIAGE_MODEL = "gpt-6-luna"
const INVESTIGATION_MODEL = "gpt-6.1-sol"
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

/** Run one headless agent from the vault, so this repo's instructions don't load on every run. */
async function runAgent<T>(
  /** Agent settings: which prompt and schema to use, and any run-specific context. */
  args: RunAgentArgs,
): Promise<T> {
  const outputPath = join(STATE_DIRECTORY_PATH, `last-${args.name}-result.json`)
  await runCodexAgent({
    codexCommand: CODEX_COMMAND_PATH,
    cwd: MEMORY_DIRECTORY_PATH,
    environment: process.env,
    eventsPath: join(STATE_DIRECTORY_PATH, `last-${args.name}-events.jsonl`),
    model: args.model,
    outputPath,
    prompt: `${readFileSync(join(import.meta.dirname, `${args.promptName}.prompt.md`), "utf8")}\n\n${args.context}\n`,
    schemaPath: join(import.meta.dirname, `${args.promptName}.schema.json`),
    threadSource: `heartbeat-${args.name}`,
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
    const context = `Current time: ${new Date().toISOString()}. Today's journal: ${join(LOG_DIRECTORY_PATH, `${date}.md`)}`
    const triage = await runAgent<TriageResult>({
      context,
      model: TRIAGE_MODEL,
      name: "triage",
      promptName: "triage",
    })
    console.log(`${new Date().toISOString()} triage escalate=${triage.escalate}: ${triage.reason}`)
    if (!triage.escalate) return

    const result = await runAgent<HeartbeatResult>({
      context: `${context}\n\nWhy the quick check flagged this: ${triage.reason}`,
      model: INVESTIGATION_MODEL,
      name: "investigation",
      promptName: "heartbeat",
    })
    console.log(`${new Date().toISOString()} ${result.outcome}: ${result.summary}`)

    // Quiet results are journaled too, so the next quick check knows a slow pace was already looked at.
    writeJournal(date, `${result.outcome}: ${result.summary}`)
    if (result.outcome !== "needs_herb") {
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

type RunAgentArgs = {
  /** Run-specific text appended to the prompt. */
  context: string
  /** Codex model ID. */
  model: string
  /** Name used for artifact files and diagnostics. */
  name: string
  /** Base name of the prompt and schema files. */
  promptName: string
}

type TriageResult = {
  escalate: boolean
  reason: string
}

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
