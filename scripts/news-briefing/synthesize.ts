import { PUBLIC_BRIEFINGS_DIRECTORY_PATH, RAW_BRIEFINGS_DIRECTORY_PATH } from "./constants.ts"
import { listMissingBriefingDates } from "./listMissingBriefingDates.ts"
import { runPiWithRawBriefing } from "./runPiWithRawBriefing.ts"
import { synthesizeBriefing } from "./synthesizeBriefing.ts"

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
    runPi: runPiWithRawBriefing,
  })
}
