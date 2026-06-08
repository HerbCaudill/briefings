import { makeNewsBriefingRuntime } from "./liveRuntime.ts"
import { synthesizeBriefing } from "./synthesizeBriefing.ts"

const requestedDate = process.argv[2]
const runtime = makeNewsBriefingRuntime()
const dates = runtime.listSynthesisDates(requestedDate)

for (const date of dates) {
  await synthesizeBriefing(runtime.createSynthesizeArgs(date))
}
