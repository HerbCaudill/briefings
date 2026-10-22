import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { getCurrentLocation } from "./getCurrentLocation.ts"

const sourcePath =
  process.argv[2] ??
  process.env.BACKTRACK_CSV_PATH ??
  (process.platform === "win32"
    ? undefined
    : join(
        homedir(),
        "Library/Mobile Documents/iCloud~com~adamlechowicz~Backtrack/Documents/backtrack.csv",
      ))

process.stdout.write(
  `${sourcePath ? getCurrentLocation(readFileSync(sourcePath, "utf8")) : "unknown"}\n`,
)
