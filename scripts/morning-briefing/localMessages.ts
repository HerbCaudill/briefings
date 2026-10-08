#!/usr/bin/env -S node --experimental-strip-types

import { getLocalTimeZone } from "./date.ts"
import { readLocalMessages } from "./readLocalMessages.ts"

/*
 * Check headless access to Signal and Apple Messages. Run once at the Mac to approve the
 * Keychain prompt; prints only conversation counts, never message text.
 */
const sources = await readLocalMessages({
  since: new Date(Date.now() - 24 * 60 * 60 * 1000),
  timeZone: getLocalTimeZone(),
})
for (const source of sources)
  process.stdout.write(
    source.status === "complete"
      ? `${source.source}: ${source.conversations.length} conversations in the last day\n`
      : `${source.source}: unavailable – ${source.reason}\n`,
  )
