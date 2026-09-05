#!/usr/bin/env -S node --experimental-strip-types

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { INBOX_STATE_PATH, VAULT_PATH } from "./constants.ts"
import { parseCaptures } from "./parseCaptures.ts"
import { researchQueue } from "./researchQueue.ts"
import { runInboxIntake } from "./runInboxIntake.ts"
import { startInboxResearch } from "./startInboxResearch.ts"

/** Run scheduled intake, inspect its source, or drain the independent research queue. */
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes("--dry-run")) {
    const source = join(VAULT_PATH, "inbox.md")
    console.log(
      JSON.stringify(
        {
          source,
          archive: join(VAULT_PATH, "Inbox archive.md"),
          state: INBOX_STATE_PATH,
          captures: existsSync(source) ? parseCaptures(readFileSync(source, "utf8")).length : 0,
          destination: "Google Tasks: Inbox",
        },
        null,
        2,
      ),
    )
    return
  }
  if (args.includes("--research-worker")) return researchQueue()
  try {
    console.log(`[inbox-processing] Transferred ${await runInboxIntake()} capture(s)`)
  } finally {
    await startInboxResearch()
  }
}

await main().catch(error => {
  console.error(`[inbox-processing] ${String(error)}`)
  process.exitCode = 1
})
