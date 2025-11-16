export type Strategy<T, R> = (results: Iterable<T>) => R;

export function awaitAll<T>(results: Iterable<T>): Promise<Array<T>> {
  return Promise.all(results);
}

export function awaitAllSettled<T>(
  results: Iterable<T>,
): Promise<Array<PromiseSettledResult<T>>> {
  return Promise.allSettled(results);
}

export async function awaitEach<T>(results: Iterable<T>): Promise<Array<T>> {
  const result = [];
  for (const r of results) {
    result.push(await r);
  }
  return result;
}

export function ignoreEach<T>(results: Iterable<T>): void {
  for (const _ of results) {
    // Ignore the results.
  }
}
