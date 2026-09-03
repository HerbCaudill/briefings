import { readFileSync } from "node:fs"

import { decodeJsonWithSchema } from "../news-briefing/decodeJsonWithSchema.ts"
import {
  MorningBriefingGatherResultSchema,
  MorningBriefingSynthesisResultSchema,
} from "./schemas.ts"
import type { MorningBriefingGatherResult, MorningBriefingSynthesisResult } from "./types.ts"

/** Read and schema-check one gather agent result. */
export function decodeGatherResult(
  /** Agent output file path. */
  path: string,
): MorningBriefingGatherResult {
  return decodeJsonWithSchema(
    MorningBriefingGatherResultSchema,
    readFileSync(path, "utf8"),
    "morning briefing gather result",
  )
}

/** Read and schema-check the synthesis agent result. */
export function decodeSynthesisResult(
  /** Agent output file path. */
  path: string,
): MorningBriefingSynthesisResult {
  return decodeJsonWithSchema(
    MorningBriefingSynthesisResultSchema,
    readFileSync(path, "utf8"),
    "morning briefing synthesis result",
  )
}
