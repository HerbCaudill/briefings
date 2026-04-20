import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { NEWS_SOURCE_CONFIGS, RAW_BRIEFINGS_DIRECTORY_PATH } from "./constants.ts"
import { buildRawBriefing } from "./buildRawBriefing.ts"

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
