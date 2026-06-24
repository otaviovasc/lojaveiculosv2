export type CatalogSyncCounts = ReturnType<typeof createCounts>;

export function createCounts() {
  return {
    brandsSeen: 0,
    modelFamiliesSeen: 0,
    versionsSeen: 0,
    yearsSeen: 0,
  };
}

export function applyLimit<T>(
  items: readonly T[],
  limit: number | undefined,
): readonly T[] {
  return limit && limit > 0 ? items.slice(0, limit) : items;
}

export function filterByCode<T extends { code: string }>(
  items: readonly T[],
  codes: readonly string[] | undefined,
): readonly T[] {
  if (!codes?.length) return items;
  const allowed = new Set(codes);
  return items.filter((item) => allowed.has(item.code));
}

export function normalizeConcurrency(value: number | undefined): number {
  return Math.max(1, Math.min(8, value ?? 2));
}

export async function runWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (cursor < items.length) {
        const item = items[cursor];
        cursor += 1;
        if (item) await worker(item);
      }
    }),
  );
}
