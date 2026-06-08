import { makeNewsBriefingRuntime } from "./liveRuntime.ts"
import { runNewsBriefingPipeline } from "./runNewsBriefingPipeline.ts"

const date = process.argv[2] ?? new Date().toISOString().slice(0, 10)
const runtime = makeNewsBriefingRuntime()

await runNewsBriefingPipeline(runtime.createPipelineArgs(date))
