import {
  NEWS_SOURCE_CONFIGS,
  PUBLIC_BRIEFINGS_DIRECTORY_PATH,
  RAW_BRIEFINGS_DIRECTORY_PATH,
} from "./constants.ts"
import { buildRawBriefing } from "./buildRawBriefing.ts"
import { clearExistingBriefingFiles } from "./clearExistingBriefingFiles.ts"
import { commitAndPushGeneratedBriefings } from "./commitAndPushGeneratedBriefings.ts"
import { fetchPageHtmlWithCurl } from "./fetchPageHtmlWithCurl.ts"
import { listMissingBriefingDates } from "./listMissingBriefingDates.ts"
import { runNewsBriefingPipeline } from "./runNewsBriefingPipeline.ts"
import { runPiWithRawBriefing } from "./runPiWithRawBriefing.ts"
import { synthesizeBriefing } from "./synthesizeBriefing.ts"

const date = process.argv[2] ?? new Date().toISOString().slice(0, 10)

const log = (message: string) => console.log(message)

await runNewsBriefingPipeline({
  clearExistingBriefingFiles: targetDate =>
    clearExistingBriefingFiles({
      briefingDirectoryPath: PUBLIC_BRIEFINGS_DIRECTORY_PATH,
      date: targetDate,
      rawDirectoryPath: RAW_BRIEFINGS_DIRECTORY_PATH,
    }),
  commitAndPushGeneratedBriefings: dates => commitAndPushGeneratedBriefings({ dates }),
  date,
  log,
  listMissingBriefingDates: () =>
    listMissingBriefingDates({
      briefingDirectoryPath: PUBLIC_BRIEFINGS_DIRECTORY_PATH,
      rawDirectoryPath: RAW_BRIEFINGS_DIRECTORY_PATH,
    }),
  runFetchStage: targetDate =>
    buildRawBriefing({
      date: targetDate,
      fetchPageHtml: fetchPageHtmlWithCurl,
      log,
      rawDirectoryPath: RAW_BRIEFINGS_DIRECTORY_PATH,
      sourceConfigs: NEWS_SOURCE_CONFIGS,
    }),
  runSynthesisStage: targetDate =>
    synthesizeBriefing({
      briefingDirectoryPath: PUBLIC_BRIEFINGS_DIRECTORY_PATH,
      date: targetDate,
      fetchPageHtml: fetchPageHtmlWithCurl,
      rawDirectoryPath: RAW_BRIEFINGS_DIRECTORY_PATH,
      runPi: runPiWithRawBriefing,
    }),
})
