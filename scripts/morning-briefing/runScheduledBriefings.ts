/** Run the personal and news briefings under the same scheduled run lock. */
export async function runScheduledBriefings(
  /** Independent generation and presentation stages. */
  args: RunScheduledBriefingsArgs,
): Promise<string> {
  const results = await Promise.allSettled([
    args.runMorning(),
    (async () => {
      await args.runNews()
      await args.presentNews()
    })(),
  ])
  const failures = results.filter(result => result.status === "rejected")
  if (failures.length)
    throw new AggregateError(
      failures.map(result => result.reason),
      failures.map(result => String(result.reason)).join("; "),
    )
  const morning = results[0]
  if (morning.status === "rejected") throw morning.reason
  return morning.value
}

type RunScheduledBriefingsArgs = {
  /** Gather, save, and present the personal briefing. */
  runMorning: () => Promise<string>
  /** Generate and publish news JSON to the website. */
  runNews: () => Promise<void>
  /** Present successfully generated news in its own pinned T3 thread. */
  presentNews: () => Promise<void>
}
