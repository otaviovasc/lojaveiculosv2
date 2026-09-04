import { useEffect, useState } from "react";

export const REMOTE_SEARCH_DELAY_MS = 450;
export const REMOTE_SEARCH_MIN_LENGTH = 2;

export function useRemoteSearch(
  input: string,
  options: { delayMs?: number; minLength?: number } = {},
): string | null {
  const delayMs = options.delayMs ?? REMOTE_SEARCH_DELAY_MS;
  const minLength = options.minLength ?? REMOTE_SEARCH_MIN_LENGTH;
  const initial = normalizeRemoteSearch(input, minLength);
  const [search, setSearch] = useState(initial);
  const normalized = normalizeRemoteSearch(input, minLength);

  useEffect(() => {
    if (normalized === null || normalized === "") {
      setSearch(normalized);
      return;
    }
    setSearch(null);
    const timeout = window.setTimeout(() => setSearch(normalized), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, normalized]);

  if (normalized === null || normalized === "") return normalized;
  return search === normalized ? search : null;
}

export function normalizeRemoteSearch(
  input: string,
  minLength = REMOTE_SEARCH_MIN_LENGTH,
): string | null {
  const search = input.trim();
  if (!search) return "";
  return search.length >= minLength ? search : null;
}
