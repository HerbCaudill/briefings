import { spawn } from "node:child_process"
import { closeSync, openSync } from "node:fs"
import { join } from "node:path"

/** Start the independently locked research worker without holding up intake or the briefing. */
export async function startInboxResearch(): Promise<void> {
  const log = openSync("/tmp/inbox-research.log", "a", 0o600)
  try {
    const child = spawn(
      process.execPath,
      ["--experimental-strip-types", join(import.meta.dirname, "run.ts"), "--research-worker"],
      {
        detached: true,
        env: process.env,
        stdio: ["ignore", log, log],
      },
    )
    await new Promise<void>((resolve, reject) => {
      child.once("error", reject)
      child.once("spawn", resolve)
    })
    child.unref()
  } finally {
    closeSync(log)
  }
}
