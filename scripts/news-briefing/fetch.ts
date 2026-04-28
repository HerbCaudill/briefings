import { NEWS_SOURCE_CONFIGS, RAW_BRIEFINGS_DIRECTORY_PATH } from "./constants.ts"
import { buildRawBriefing } from "./buildRawBriefing.ts"
import { fetchPageHtmlWithCurl } from "./fetchPageHtmlWithCurl.ts"

const date = process.argv[2] ?? new Date().toISOString().slice(0, 10)

await buildRawBriefing({
  date,
  fetchPageHtml: fetchPageHtmlWithCurl,
  rawDirectoryPath: RAW_BRIEFINGS_DIRECTORY_PATH,
  sourceConfigs: NEWS_SOURCE_CONFIGS,
})
