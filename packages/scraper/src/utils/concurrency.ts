/**
 * Splits an array into chunks of a specified size.
 * Does not mutate the original array.
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const results: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    results.push(array.slice(i, i + chunkSize));
  }
  return results;
}

/**
 * Maps over an array with a specified concurrency limit.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const executing = new Set<Promise<void>>();
  const promises: Promise<void>[] = [];

  for (const [index, item] of items.entries()) {
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }

    const p = fn(item).then((result) => {
      results[index] = result;
    });

    const wrapper = p.finally(() => {
      executing.delete(wrapper);
    });

    executing.add(wrapper);
    promises.push(wrapper);
  }

  await Promise.all(promises);
  return results;
}
