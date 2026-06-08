import { buildRawBriefing } from "./buildRawBriefing.ts"
import { makeNewsBriefingRuntime } from "./liveRuntime.ts"

const date = process.argv[2] ?? new Date().toISOString().slice(0, 10)
const runtime = makeNewsBriefingRuntime()

await buildRawBriefing(runtime.createFetchArgs(date))
