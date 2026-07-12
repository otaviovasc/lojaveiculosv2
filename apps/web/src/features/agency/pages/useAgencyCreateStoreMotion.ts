import { animate, stagger } from "animejs";
import { useEffect, useRef } from "react";

export function useAgencyCreateStoreMotion() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window.matchMedia !== "function") return;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const revealTargets = Array.from(
      root.querySelectorAll<HTMLElement>(
        ".agency-create-intro, .agency-create-form-card, .agency-create-guidance",
      ),
    );
    const watermark = root.querySelector<HTMLElement>(
      ".agency-create-intro__watermark",
    );
    const flowSteps = Array.from(
      root.querySelectorAll<HTMLElement>(".agency-create-flow__step"),
    );

    const revealAnimation = animate(revealTargets, {
      delay: stagger(70),
      duration: 520,
      ease: "out(4)",
      y: { from: 14 },
    });
    const flowAnimation = animate(flowSteps, {
      delay: stagger(55, { start: 180 }),
      duration: 420,
      ease: "out(3)",
      scale: { from: 0.94 },
    });
    const watermarkAnimation = watermark
      ? animate(watermark, {
          duration: 900,
          ease: "out(4)",
          rotate: { from: -3 },
          scale: { from: 0.92 },
        })
      : null;

    return () => {
      revealAnimation.revert();
      flowAnimation.revert();
      watermarkAnimation?.revert();
    };
  }, []);

  return rootRef;
}
