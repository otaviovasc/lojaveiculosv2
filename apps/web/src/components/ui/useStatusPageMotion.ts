import { animate, stagger } from "animejs";
import { useEffect, useRef } from "react";

/**
 * Staged entrance for full-page status surfaces (≤600 ms total).
 * Elements render visible by default; the animation only sweeps them in, so
 * reduced-motion users and no-JS environments always see the full page.
 */
export function useStatusPageMotion<T extends HTMLElement>() {
  const rootRef = useRef<T>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window.matchMedia !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const revealTargets = Array.from(
      root.querySelectorAll<HTMLElement>("[data-status-motion]"),
    );
    const reveal = animate(revealTargets, {
      delay: stagger(55),
      duration: 380,
      ease: "out(4)",
      opacity: { from: 0 },
      y: { from: 14 },
    });
    const scene = root.querySelector<HTMLElement>(".status-page__scene");
    const scenePop = scene
      ? animate(scene, { duration: 520, ease: "out(4)", scale: { from: 0.94 } })
      : null;

    return () => {
      reveal.revert();
      scenePop?.revert();
    };
  }, []);

  return rootRef;
}
