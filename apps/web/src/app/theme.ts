export type AppTheme = "dark" | "light";

export type ThemeStorage = Pick<Storage, "getItem" | "setItem">;

const storageKey = "lojaveiculosv2.theme";

export function getPreferredTheme(input: {
  prefersDark: boolean;
  storage?: ThemeStorage;
}): AppTheme {
  const stored = readStoredTheme(input.storage);
  if (stored) return stored;
  return input.prefersDark ? "dark" : "light";
}

export function getNextTheme(theme: AppTheme): AppTheme {
  return theme === "dark" ? "light" : "dark";
}

export function persistTheme(
  storage: ThemeStorage | undefined,
  theme: AppTheme,
) {
  try {
    storage?.setItem(storageKey, theme);
  } catch {
    return;
  }
}

export function applyThemeToDocument(theme: AppTheme, documentRef = document) {
  documentRef.documentElement.dataset.theme = theme;
  documentRef.documentElement.style.colorScheme = theme;
}

export function readBrowserPreferredTheme(): AppTheme {
  const canReadMedia =
    typeof window !== "undefined" && typeof window.matchMedia === "function";
  const input: { prefersDark: boolean; storage?: ThemeStorage } = {
    prefersDark:
      canReadMedia && window.matchMedia("(prefers-color-scheme: dark)").matches,
  };
  if (typeof window !== "undefined") input.storage = window.localStorage;
  return getPreferredTheme(input);
}

export function applyInitialTheme() {
  if (typeof document === "undefined") return;
  applyThemeToDocument(readBrowserPreferredTheme());
}

function readStoredTheme(storage: ThemeStorage | undefined): AppTheme | null {
  try {
    const stored = storage?.getItem(storageKey);
    return stored === "dark" || stored === "light" ? stored : null;
  } catch {
    return null;
  }
}
