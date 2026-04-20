import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { PUBLIC_BRIEFINGS_DIRECTORY_PATH, RAW_BRIEFINGS_DIRECTORY_PATH } from "./constants.ts"
import { listMissingBriefingDates } from "./listMissingBriefingDates.ts"
import { synthesizeBriefing } from "./synthesizeBriefing.ts"

const execFileAsync = promisify(execFile)
const requestedDate = process.argv[2]
const dates =
  requestedDate ?
    [requestedDate]
  : listMissingBriefingDates({
      briefingDirectoryPath: PUBLIC_BRIEFINGS_DIRECTORY_PATH,
      rawDirectoryPath: RAW_BRIEFINGS_DIRECTORY_PATH,
    })

for (const date of dates) {
  await synthesizeBriefing({
    briefingDirectoryPath: PUBLIC_BRIEFINGS_DIRECTORY_PATH,
    date,
    rawDirectoryPath: RAW_BRIEFINGS_DIRECTORY_PATH,
    runPi: async ({ prompt, rawBriefingPath }) => {
      const { stdout } = await execFileAsync("pi", ["-p", `@${rawBriefingPath}`, prompt])
      return stdout
    },
  })
}
