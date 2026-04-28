import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

/** Fetch one page of HTML with curl. */
export async function fetchPageHtmlWithCurl(
  /** The URL to fetch. */
  url: string,
): Promise<string> {
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
}
