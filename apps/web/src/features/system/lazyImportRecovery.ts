const RECOVERY_STORAGE_KEY = "lojaveiculosv2:stale-lazy-import-reload";
const RECOVERY_WINDOW_MS = 60_000;

type RecoveryStorage = Pick<Storage, "getItem" | "setItem">;

type LazyImportRecoveryOptions = {
  now?: number;
  reload?: () => void;
  storage?: RecoveryStorage;
};

export function recoverFromStaleLazyImport(
  error: unknown,
  options: LazyImportRecoveryOptions = {},
) {
  if (!isStaleLazyImportError(error) || typeof window === "undefined") {
    return false;
  }

  const now = options.now ?? Date.now();
  const reload = options.reload ?? (() => window.location.reload());
  const storage = options.storage ?? window.sessionStorage;

  try {
    const previousReloadAt = Number(storage.getItem(RECOVERY_STORAGE_KEY));
    if (
      Number.isFinite(previousReloadAt) &&
      previousReloadAt > 0 &&
      now - previousReloadAt < RECOVERY_WINDOW_MS
    ) {
      return false;
    }
    storage.setItem(RECOVERY_STORAGE_KEY, String(now));
  } catch {
    return false;
  }

  reload();
  return true;
}

function isStaleLazyImportError(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const normalized = `${name} ${message}`.toLowerCase();

  return [
    "chunkloaderror",
    "error loading dynamically imported module",
    "failed to fetch dynamically imported module",
    "failed to load module script",
    "importing a module script failed",
    "loading chunk",
    "unable to preload css",
  ].some((fragment) => normalized.includes(fragment));
}
