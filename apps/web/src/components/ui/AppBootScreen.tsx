import { animate, createScope, stagger } from "animejs";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Logo } from "./logo";
import { cx } from "./featureShared";

export interface AppBootScreenProps {
  /** Status verb shown under the logo, e.g. "Validando sessão". */
  title: ReactNode;
  /** Optional supporting line rendered in muted text. */
  description?: ReactNode;
  /** Optional small footer content (hints, legal, retry links). */
  footer?: ReactNode;
  /** Set false to hide the indeterminate progress line. */
  showProgress?: boolean;
  className?: string;
}

/**
 * Premium full-screen loading surface for boot/auth/permission moments.
 *
 * Renders the Loja Veículos logo over a soft token-based accent glow with an
 * indeterminate brand-red progress line. Entry motion uses Anime.js scoped
 * animations (≤600 ms, reduced-motion safe); the continuous shimmer runs in
 * CSS only when `prefers-reduced-motion: no-preference`.
 */
export function AppBootScreen({
  title,
  description,
  footer,
  showProgress = true,
  className,
}: AppBootScreenProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [logoVariant] = useState<"full" | "full-white">(() =>
    typeof document !== "undefined" &&
    document.documentElement.dataset.theme === "dark"
      ? "full-white"
      : "full",
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window.matchMedia !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const scope = createScope({ root });
    scope.add(() => {
      animate(root.querySelectorAll("[data-boot-motion]"), {
        delay: stagger(70),
        duration: 420,
        ease: "out(4)",
        opacity: { from: 0 },
        y: { from: 12 },
      });
      const glow = root.querySelector(".app-boot-screen__glow");
      if (glow) {
        animate(glow, {
          duration: 560,
          ease: "out(4)",
          opacity: { from: 0 },
          scale: { from: 0.92 },
        });
      }
    });
    return () => scope.revert();
  }, []);

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cx("app-boot-screen", className)}
      ref={rootRef}
      role="status"
    >
      <span aria-hidden="true" className="app-boot-screen__glow" />
      <span
        aria-hidden="true"
        className="app-boot-screen__glow app-boot-screen__glow--low"
      />
      <div className="app-boot-screen__inner">
        <div data-boot-motion>
          <Logo
            alt="Loja Veículos"
            className="app-boot-screen__logo"
            variant={logoVariant}
          />
        </div>
        <p className="app-boot-screen__title" data-boot-motion>
          {title}
        </p>
        {description ? (
          <p className="app-boot-screen__description" data-boot-motion>
            {description}
          </p>
        ) : null}
        {showProgress ? (
          <div
            aria-hidden="true"
            className="app-boot-screen__track"
            data-boot-motion
          />
        ) : null}
      </div>
      {footer ? (
        <div className="app-boot-screen__footer" data-boot-motion>
          {footer}
        </div>
      ) : null}
    </div>
  );
}
