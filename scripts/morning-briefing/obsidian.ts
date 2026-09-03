import { spawn } from "node:child_process"

const MAX_STATUS_CHECKS = 30
const STATUS_DELAY_MS = 1_000

/** Open Obsidian, enable Sync, and wait until the notes vault is synced. */
export async function syncMorningBriefingToObsidian(
  /** Injectable commands and timing for tests. */
  dependencies: ObsidianSyncDependencies = {},
): Promise<void> {
  const maxStatusChecks = dependencies.maxStatusChecks ?? MAX_STATUS_CHECKS
  const openObsidian = dependencies.openObsidian ?? openObsidianApp
  const runObsidian = dependencies.runObsidian ?? runObsidianCommand
  const wait = dependencies.wait ?? waitForStatusCheck

  await openObsidian()

  for (let attempt = 0; attempt < maxStatusChecks; attempt += 1) {
    try {
      await runObsidian(["vault=notes", "sync", "on"])
      break
    } catch (error) {
      if (attempt === maxStatusChecks - 1) throw error
      await wait()
    }
  }

  for (let check = 0; check < maxStatusChecks; check += 1) {
    const status = await runObsidian(["vault=notes", "sync:status"])
    if (status.split("\n").some(line => line.trim() === "status: synced")) return
    if (check < maxStatusChecks - 1) await wait()
  }

  throw new Error(`Obsidian Sync did not finish after ${maxStatusChecks} status checks`)
}

/** Open Obsidian so its CLI and Sync service are available. */
function openObsidianApp(): Promise<void> {
  return runCommand("open", ["-a", "Obsidian"]).then(() => undefined)
}

/** Run one official Obsidian CLI command. */
function runObsidianCommand(arguments_: string[]): Promise<string> {
  return runCommand("obsidian", arguments_)
}

/** Run a local command and return standard output. */
function runCommand(command: string, arguments_: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, arguments_, { stdio: ["ignore", "pipe", "pipe"] })
    const outputChunks: Buffer[] = []
    const errorChunks: Buffer[] = []

    child.stdout.on("data", chunk => outputChunks.push(Buffer.from(chunk)))
    child.stderr.on("data", chunk => errorChunks.push(Buffer.from(chunk)))
    child.on("error", reject)
    child.on("close", (code, signal) => {
      if (code === 0) {
        resolve(Buffer.concat(outputChunks).toString("utf8"))
        return
      }

      const standardError = Buffer.concat(errorChunks).toString("utf8").trim()
      reject(
        new Error(
          standardError ||
            (signal
              ? `${command} stopped by ${signal}`
              : `${command} exited with status ${code ?? "unknown"}`),
        ),
      )
    })
  })
}

/** Wait before the next Obsidian Sync status check. */
function waitForStatusCheck(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, STATUS_DELAY_MS))
}

export type ObsidianSyncDependencies = {
  /** Maximum number of start attempts and status checks. */
  maxStatusChecks?: number
  /** Open Obsidian. */
  openObsidian?: () => Promise<void>
  /** Run one Obsidian CLI command. */
  runObsidian?: (arguments_: string[]) => Promise<string>
  /** Wait before retrying. */
  wait?: () => Promise<void>
}
