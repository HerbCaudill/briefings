import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

/** Fetch one page of HTML with curl. */
export async function fetchPageHtmlWithCurl(
  /** The URL to fetch. */
  url: string,
): Promise<string> {
  const { stdout } = await execFileAsync(
    "curl",
    [
      "-s",
      "-f",
      "-L",
      "--max-time",
      "15",
      "-H",
      "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "-H",
      "Accept-Language: en-US,en;q=0.9",
      "-H",
      "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      url,
    ],
    { maxBuffer: 10 * 1024 * 1024 },
  )

  return stdout
}
