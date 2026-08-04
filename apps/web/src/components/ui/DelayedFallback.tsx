import { useEffect, useState, type ReactNode } from "react";

/**
 * Anti-flicker Suspense fallback: renders nothing during the first `delay`
 * milliseconds, so fast chunk/data resolutions never flash a loading surface.
 * When loading outlives the delay, the fallback appears (its own entry motion
 * covers the fade-in).
 */
export function DelayedFallback({
  children,
  delay = 160,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);

  return visible ? <>{children}</> : null;
}

/**
 * Wraps a lazy-import loader so that, once the load took long enough for the
 * fallback to become visible, the fallback stays on screen for a minimum
 * total duration instead of flashing out. Loads faster than the delay are
 * never delayed.
 */
export function withMinimumVisibleTime<T>(
  loader: () => Promise<T>,
  {
    delay = 160,
    minDuration = 560,
  }: { delay?: number; minDuration?: number } = {},
): () => Promise<T> {
  return () => {
    const start =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    return loader().then((module) => {
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const elapsed = now - start;
      if (elapsed <= delay || elapsed >= minDuration) return module;
      return new Promise<T>((resolve) => {
        setTimeout(() => resolve(module), minDuration - elapsed);
      });
    });
  };
}
