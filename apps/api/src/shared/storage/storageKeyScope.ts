/**
 * R2 prefixes every object key with the deployment environment (`l/`, `s/`,
 * or `p/`). Domain scope checks compare the logical tenant/store path, so
 * remove only that leading segment before validating ownership.
 */
export function stripStorageEnvironmentPrefix(
  storageKey: string,
  environment?: string,
) {
  const prefix = storageKey.match(/^([lsp])\//)?.[1];
  if (!prefix) return storageKey;

  const expectedPrefix = environmentPrefix(environment);
  if (expectedPrefix && expectedPrefix !== prefix) return storageKey;
  return storageKey.slice(2);
}

/**
 * Returns whether a storage key belongs to the known runtime environment.
 * Test and memory adapters may omit APP_ENV, so an unknown environment remains
 * permissive; configured R2 runtimes always provide it through ServiceContext.
 */
export function isStorageKeyInEnvironment(
  storageKey: string,
  environment?: string,
): boolean {
  const expectedPrefix = environmentPrefix(environment);
  return expectedPrefix ? storageKey.startsWith(`${expectedPrefix}/`) : true;
}

function environmentPrefix(environment?: string) {
  const normalized = environment?.trim().toLowerCase();
  if (normalized === "production") return "p";
  if (normalized === "staging") return "s";
  if (
    normalized === "local" ||
    normalized === "development" ||
    normalized === "test"
  ) {
    return "l";
  }
  return null;
}
