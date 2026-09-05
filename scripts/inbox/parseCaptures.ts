import { createHash } from "node:crypto"
import type { Capture } from "./types.ts"

/** Split timestamped captures while retaining multiline dictation verbatim. */
export function parseCaptures(text: string): Capture[] {
  const starts = [
    ...text.matchAll(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})): /gm),
  ]
  return starts
    .map((match, index) => {
      const raw = text.slice(match.index, starts[index + 1]?.index ?? text.length).trimEnd()
      return { id: createHash("sha256").update(raw).digest("hex"), timestamp: match[1]!, raw }
    })
    .filter(capture => Number.isFinite(Date.parse(capture.timestamp)))
}
