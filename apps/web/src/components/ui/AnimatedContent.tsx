import { animate, createScope, utils } from "animejs";
import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
} from "react";

export interface AnimatedContentProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> {
  animateOpacity?: boolean;
  children: ReactNode;
  container?: string | HTMLElement | null;
  delay?: number;
  disappearAfter?: number;
  disappearDuration?: number;
  disappearEase?: string;
  distance?: number;
  direction?: "vertical" | "horizontal";
  duration?: number;
  ease?: string;
  initialOpacity?: number;
  onComplete?: () => void;
  onDisappearanceComplete?: () => void;
  reverse?: boolean;
  scale?: number;
  threshold?: number;
  trigger?: "mount" | "scroll";
}

export default function AnimatedContent({
  animateOpacity = true,
  children,
  className = "",
  container,
  delay = 0,
  disappearAfter = 0,
  disappearDuration = 0.18,
  disappearEase = "easeIn",
  distance = 24,
  direction = "vertical",
  duration = 0.26,
  ease = "easeOut",
  initialOpacity = 0,
  onComplete,
  onDisappearanceComplete,
  reverse = false,
  scale = 1,
  style,
  threshold = 0.1,
  trigger = "scroll",
  ...props
}: AnimatedContentProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onComplete, onDisappearanceComplete });
  callbacksRef.current = { onComplete, onDisappearanceComplete };
  const offset = (reverse ? -1 : 1) * distance;
  const hiddenStyle = initialStyle({
    animateOpacity,
    direction,
    initialOpacity,
    offset,
    scale,
    style,
  });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) {
      utils.set(element, {
        opacity: 1,
        transform: style?.transform ?? "none",
        visibility: "visible",
        willChange: "auto",
      });
      callbacksRef.current.onComplete?.();
      return;
    }

    let disappearTimer: number | undefined;
    let started = false;
    const scope = createScope({ root: element });
    const start = () => {
      if (started) return;
      started = true;
      scope.add(() => {
        utils.set(element, { visibility: "visible" });
        animate(element, {
          delay: delay * 1000,
          duration: duration * 1000,
          ease: normalizeEase(ease),
          opacity: 1,
          scale: 1,
          x: 0,
          y: 0,
          onComplete: () => {
            if (disappearAfter <= 0) {
              utils.set(element, { willChange: "auto" });
            }
            callbacksRef.current.onComplete?.();
            if (disappearAfter <= 0) return;
            disappearTimer = window.setTimeout(() => {
              scope.add(() => {
                animate(element, {
                  duration: disappearDuration * 1000,
                  ease: normalizeEase(disappearEase),
                  opacity: animateOpacity ? initialOpacity : 0,
                  scale: 0.98,
                  x: direction === "horizontal" ? -offset : 0,
                  y: direction === "vertical" ? -offset : 0,
                  onComplete: () => {
                    utils.set(element, { willChange: "auto" });
                    callbacksRef.current.onDisappearanceComplete?.();
                  },
                });
              });
            }, disappearAfter * 1000);
          },
        });
      });
    };

    if (trigger === "mount" || typeof IntersectionObserver === "undefined") {
      start();
      return () => {
        if (disappearTimer !== undefined) window.clearTimeout(disappearTimer);
        scope.revert();
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        start();
      },
      { root: resolveContainer(container), threshold },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (disappearTimer !== undefined) window.clearTimeout(disappearTimer);
      scope.revert();
    };
  }, [
    animateOpacity,
    container,
    delay,
    disappearAfter,
    disappearDuration,
    disappearEase,
    direction,
    duration,
    ease,
    initialOpacity,
    offset,
    style?.transform,
    threshold,
    trigger,
  ]);

  return (
    <div {...props} className={className} ref={elementRef} style={hiddenStyle}>
      {children}
    </div>
  );
}

function initialStyle({
  animateOpacity,
  direction,
  initialOpacity,
  offset,
  scale,
  style,
}: {
  animateOpacity: boolean;
  direction: "vertical" | "horizontal";
  initialOpacity: number;
  offset: number;
  scale: number;
  style: CSSProperties | undefined;
}): CSSProperties {
  const translation =
    direction === "horizontal"
      ? `translate3d(${offset}px, 0, 0)`
      : `translate3d(0, ${offset}px, 0)`;
  return {
    ...style,
    opacity: animateOpacity ? initialOpacity : 1,
    transform:
      `${style?.transform ?? ""} ${translation} scale(${scale})`.trim(),
    visibility: "hidden",
    willChange: "opacity, transform",
  };
}

function resolveContainer(container: string | HTMLElement | null | undefined) {
  if (typeof HTMLElement !== "undefined" && container instanceof HTMLElement) {
    return container;
  }
  if (typeof container === "string") return document.querySelector(container);
  return document.getElementById("snap-main-container");
}

function normalizeEase(ease: string) {
  const normalized = ease.toLowerCase();
  if (normalized.includes("linear") || normalized === "none") return "linear";
  if (normalized.includes("inout") || normalized.includes("in-out")) {
    return "inOut(3)";
  }
  if (normalized.includes("in") && !normalized.includes("out")) return "in(3)";
  return "out(3)";
}
