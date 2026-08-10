import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export type StorefrontAppearanceMode = "both" | "dark" | "light";
export type StorefrontColorScheme = "dark" | "light";

export function readStorefrontAppearanceMode(
  theme: Record<string, unknown>,
): StorefrontAppearanceMode {
  return theme.appearanceMode === "dark" || theme.appearanceMode === "both"
    ? theme.appearanceMode
    : "light";
}

export function useStorefrontAppearance({
  mode,
  storeSlug,
}: {
  mode: StorefrontAppearanceMode;
  storeSlug: string;
}) {
  const storageKey = `lojaveiculosv2:storefront-color-scheme:${storeSlug}`;
  const [scheme, setScheme] = useState<StorefrontColorScheme>(() =>
    resolveInitialScheme(mode, storageKey),
  );

  useEffect(() => {
    setScheme(resolveInitialScheme(mode, storageKey));
  }, [mode, storageKey]);

  const toggle = () => {
    if (mode !== "both") return;
    setScheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      writeStoredScheme(storageKey, next);
      return next;
    });
  };

  return { scheme, toggle };
}

export function StorefrontThemeToggle({
  onToggle,
  scheme,
}: {
  onToggle: () => void;
  scheme: StorefrontColorScheme;
}) {
  const nextLabel = scheme === "dark" ? "claro" : "escuro";
  const Icon = scheme === "dark" ? Sun : Moon;
  return (
    <button
      aria-label={`Usar tema ${nextLabel}`}
      className="public-storefront-theme-toggle"
      onClick={onToggle}
      title={`Usar tema ${nextLabel}`}
      type="button"
    >
      <Icon aria-hidden="true" />
      <span className="public-storefront-theme-toggle__label">
        Usar tema {nextLabel}
      </span>
    </button>
  );
}

function resolveInitialScheme(
  mode: StorefrontAppearanceMode,
  storageKey: string,
): StorefrontColorScheme {
  if (mode !== "both") return mode;
  const stored = readStoredScheme(storageKey);
  if (stored) return stored;
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readStoredScheme(storageKey: string): StorefrontColorScheme | null {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored === "dark" || stored === "light" ? stored : null;
  } catch {
    return null;
  }
}

function writeStoredScheme(storageKey: string, scheme: StorefrontColorScheme) {
  try {
    localStorage.setItem(storageKey, scheme);
  } catch {
    // Persistence is optional when storage is unavailable.
  }
}
