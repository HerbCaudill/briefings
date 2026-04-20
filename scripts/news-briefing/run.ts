import { execFile } from "node:child_process"
import { promisify } from "node:util"
import {
  NEWS_SOURCE_CONFIGS,
  PUBLIC_BRIEFINGS_DIRECTORY_PATH,
  RAW_BRIEFINGS_DIRECTORY_PATH,
} from "./constants.ts"
import { buildRawBriefing } from "./buildRawBriefing.ts"
import { listMissingBriefingDates } from "./listMissingBriefingDates.ts"
import { synthesizeBriefing } from "./synthesizeBriefing.ts"

const execFileAsync = promisify(execFile)
const date = process.argv[2] ?? new Date().toISOString().slice(0, 10)

await buildRawBriefing({
  date,
  fetchPageHtml: async url => {
    const { stdout } = await execFileAsync("curl", [
      "-s",
      "-L",
      "--max-time",
      "15",
      "-H",
      "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      url,
    ])

    return stdout
  },
  rawDirectoryPath: RAW_BRIEFINGS_DIRECTORY_PATH,
  sourceConfigs: NEWS_SOURCE_CONFIGS,
})

for (const missingDate of listMissingBriefingDates({
  briefingDirectoryPath: PUBLIC_BRIEFINGS_DIRECTORY_PATH,
  rawDirectoryPath: RAW_BRIEFINGS_DIRECTORY_PATH,
})) {
  await synthesizeBriefing({
    briefingDirectoryPath: PUBLIC_BRIEFINGS_DIRECTORY_PATH,
    date: missingDate,
    rawDirectoryPath: RAW_BRIEFINGS_DIRECTORY_PATH,
    runPi: async ({ prompt, rawBriefingPath }) => {
      const { stdout } = await execFileAsync("pi", ["-p", `@${rawBriefingPath}`, prompt])
      return stdout
    },
  })
}
