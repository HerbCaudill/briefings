import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { getCurrentLocation } from "./getCurrentLocation.ts"

const sourcePath =
  process.argv[2] ??
  join(
    homedir(),
    "Library/Mobile Documents/iCloud~com~adamlechowicz~Backtrack/Documents/backtrack.csv",
  )

process.stdout.write(`${getCurrentLocation(readFileSync(sourcePath, "utf8"))}\n`)
