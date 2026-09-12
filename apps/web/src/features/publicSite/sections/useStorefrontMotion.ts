import { animate, stagger } from "animejs";
import { useEffect, useRef } from "react";
import type { StorefrontMotionStyle } from "../config/types";

/**
 * Section entrance reveal driven by the storefront motion profile. Elements
 * render visible by default; the animation only sweeps them in, so
 * reduced-motion users and no-JS environments always see the full section.
 * Only the "dynamic" profile animates (≤600 ms total); "subtle" relies on the
 * 120 ms hover micro-interactions from the --sf-motion-micro token.
 */
export function useStorefrontSectionReveal<T extends HTMLElement>(
  style: StorefrontMotionStyle,
) {
  const rootRef = useRef<T>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || style !== "dynamic") return;
    if (typeof window.matchMedia !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = Array.from(
      root.querySelectorAll<HTMLElement>("[data-sf-reveal]"),
    );
    if (!targets.length) return;

    const reveal = animate(targets, {
      delay: stagger(70),
      duration: 240,
      ease: "out(4)",
      opacity: { from: 0 },
      y: { from: 16 },
    });
    return () => {
      reveal.revert();
    };
  }, [style]);

  return rootRef;
}
