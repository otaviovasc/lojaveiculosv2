import { useEffect, useRef, useState, type ReactNode } from "react";

export type AnimatedIconSwapVariant =
  "scale-fade" | "pop" | "rotate-spin" | "flip" | "slide-up";

type AnimatedIconSwapProps = {
  /** Key that changes when state/icon changes (e.g. isDark, isOpen, viewMode, activeTab, isCopied) */
  stateKey: string | number | boolean;
  children: ReactNode;
  /** Animation style: 'scale-fade' (default) | 'pop' | 'rotate-spin' | 'flip' | 'slide-up' */
  variant?: AnimatedIconSwapVariant;
  className?: string;
};

type SwappedOutIcon = {
  key: string | number | boolean;
  icon: ReactNode;
};

const EXIT_DURATION_MS = 200;

export function AnimatedIconSwap({
  stateKey,
  children,
  variant = "scale-fade",
  className = "",
}: AnimatedIconSwapProps) {
  const [previous, setPrevious] = useState<SwappedOutIcon | null>(null);
  const [lastKey, setLastKey] = useState(stateKey);
  const lastIconRef = useRef(children);

  // Adjust state during render so the outgoing and incoming layers mount in
  // the same commit. Doing this in an effect caused a post-paint swap plus a
  // setState-per-render loop that raced the animation and made the icon
  // appear to change instantly.
  if (stateKey !== lastKey) {
    setPrevious({ key: lastKey, icon: lastIconRef.current });
    setLastKey(stateKey);
  }

  // Keep the ref pointing at the latest icon after each commit; the previous
  // render's icon is captured above before this runs.
  useEffect(() => {
    lastIconRef.current = children;
  });

  useEffect(() => {
    if (!previous) return undefined;
    const timer = setTimeout(() => setPrevious(null), EXIT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [previous]);

  return (
    <span
      className={`animated-icon-swap-container animated-icon-swap-${variant} ${className}`}
    >
      {previous ? (
        <span className="animated-icon-layer animated-icon-exit">
          {previous.icon}
        </span>
      ) : null}
      <span
        className={`animated-icon-layer ${previous ? "animated-icon-enter" : ""}`}
        key={String(stateKey)}
      >
        {children}
      </span>
    </span>
  );
}
