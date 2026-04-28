/** Map an array with a fixed concurrency limit while preserving result order. */
export async function mapWithConcurrency<TInput, TOutput>(
  /** The input items to process. */
  items: TInput[],
  /** The maximum number of concurrent operations. */
  concurrency: number,
  /** The mapper to run for each item. */
  mapItem: (item: TInput, index: number) => Promise<TOutput>,
): Promise<TOutput[]> {
  const results = new Array<TOutput>(items.length)
  let nextIndex = 0

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex
        nextIndex += 1
        results[currentIndex] = await mapItem(items[currentIndex], currentIndex)
      }
    }),
  )

  return results
}
