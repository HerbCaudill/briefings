import { spawn } from "node:child_process"
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"

import type { LocalMessagesSource } from "./types.ts"

/**
 * Read recent Signal Desktop conversations with sigtop, which works with the screen locked.
 * Apple's `security` tool fetches the database key, so the Keychain's "Always Allow" approval
 * stays attached to a stable binary across sigtop updates.
 */
export async function readSignalMessages(
  /** Time window and optional command runner. */
  args: {
    /** Earliest message to include. */
    since: Date
    /** Time zone for the export window and transcript timestamps. */
    timeZone: string
    /** Command runner, injectable for tests. */
    run?: CommandRunner
  },
): Promise<LocalMessagesSource> {
  const run = args.run ?? runCommand
  const key = await run("/usr/bin/security", [
    "find-generic-password",
    "-w",
    "-s",
    "Signal Safe Storage",
  ]).catch(error => ({ code: -1, stdout: "", stderr: String(error) }))
  if (key.code !== 0 || !key.stdout.trim())
    return unavailable(
      `The Keychain did not release the Signal Safe Storage key; run \`pnpm messages:local\` once at the Mac and choose Always Allow (${key.stderr.trim()})`,
    )

  const directory = mkdtempSync(join(tmpdir(), "signal-export-"))
  try {
    const exported = await run(
      "sigtop",
      [
        "export-messages",
        "-f",
        "text-short",
        "-k",
        "macos:-",
        "-s",
        `${formatLocalMinute(args.since, args.timeZone)},`,
        directory,
      ],
      { input: key.stdout, env: { ...process.env, TZ: args.timeZone } },
    ).catch(error => ({ code: -1, stdout: "", stderr: String(error) }))
    if (exported.code !== 0)
      return unavailable(`sigtop could not export Signal messages (${exported.stderr.trim()})`)

    const conversations = readdirSync(directory)
      .filter(file => file.endsWith(".txt"))
      .sort()
      .map(file => ({
        name: basename(file, ".txt"),
        transcript: readFileSync(join(directory, file), "utf8")
          .trim()
          .split("\n")
          .slice(-MAX_LINES_PER_CONVERSATION)
          .join("\n"),
      }))
      .filter(conversation => conversation.transcript)
    return { source: "Signal", status: "complete", conversations }
  } finally {
    rmSync(directory, { force: true, recursive: true })
  }
}

/** Describe an unreadable Signal source. */
function unavailable(reason: string): LocalMessagesSource {
  return { source: "Signal", status: "unavailable", reason, conversations: [] }
}

/** Format a time as sigtop's `YYYY-MM-DDTHH:MM` in the given zone. */
function formatLocalMinute(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(date)
    .replace(" ", "T")
}

/** Run a command with optional stdin, collecting its output. */
const runCommand: CommandRunner = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: options.env, stdio: ["pipe", "pipe", "pipe"] })
    let stdout = ""
    let stderr = ""
    const timer = setTimeout(() => child.kill(), COMMAND_TIMEOUT_MS)
    child.stdout.setEncoding("utf8").on("data", chunk => (stdout += chunk))
    child.stderr.setEncoding("utf8").on("data", chunk => (stderr += chunk))
    child.on("error", reject)
    child.on("close", code => {
      clearTimeout(timer)
      resolve({ code: code ?? -1, stdout, stderr })
    })
    child.stdin.end(options.input ?? "")
  })

// CONSTANTS

/** Keep long group chats readable for the gather agent. */
const MAX_LINES_PER_CONVERSATION = 200

/** Fail rather than hang if the Keychain waits for a prompt nobody will answer. */
const COMMAND_TIMEOUT_MS = 60_000

// TYPES

/** Run one command and report its exit code and output. */
export type CommandRunner = (
  command: string,
  args: readonly string[],
  options?: { input?: string; env?: NodeJS.ProcessEnv },
) => Promise<{ code: number; stdout: string; stderr: string }>
