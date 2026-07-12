import { motion, useReducedMotion } from "motion/react";
import { useEffect, type ReactNode } from "react";

interface CountUpProps {
  to: number;
  from?: number;
  direction?: "up" | "down";
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

export default function CountUp({
  to,
  from = 0,
  direction = "up",
  delay = 0,
  duration = 2,
  className = "",
  startWhen = true,
  separator = "",
  onStart,
  onEnd,
}: CountUpProps) {
  const finalValue = direction === "down" ? from : to;
  const decimals = Math.max(decimalPlaces(from), decimalPlaces(to));
  const text = formatNumber(finalValue, decimals, separator);

  useMetricCallbacks({ delay, duration, onEnd, onStart, startWhen });

  return (
    <FinalMetric
      className={className}
      delay={delay}
      duration={duration}
      startWhen={startWhen}
    >
      {text}
    </FinalMetric>
  );
}

export function AnimatedCounter({
  value,
  className = "",
  duration = 1.5,
}: {
  value: string | number;
  className?: string;
  duration?: number;
}) {
  return (
    <FinalMetric className={className} duration={duration} startWhen>
      {String(value)}
    </FinalMetric>
  );
}

function FinalMetric({
  children,
  className,
  delay = 0,
  duration,
  startWhen,
}: {
  children: ReactNode;
  className: string;
  delay?: number;
  duration: number;
  startWhen: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const feedbackDuration = Math.min(Math.max(duration, 0), 0.26);
  const shouldAnimate = startWhen && !shouldReduceMotion;

  return (
    <motion.span
      animate={{ opacity: 1, y: 0 }}
      className={className}
      initial={shouldAnimate ? { opacity: 0.88, y: 2 } : false}
      transition={{
        delay: shouldAnimate ? Math.max(delay, 0) : 0,
        duration: shouldAnimate ? feedbackDuration : 0,
      }}
    >
      {children}
    </motion.span>
  );
}

function useMetricCallbacks({
  delay,
  duration,
  onEnd,
  onStart,
  startWhen,
}: {
  delay: number | undefined;
  duration: number | undefined;
  onEnd: (() => void) | undefined;
  onStart: (() => void) | undefined;
  startWhen: boolean | undefined;
}) {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!startWhen) return;
    const safeDelay = shouldReduceMotion ? 0 : Math.max(delay ?? 0, 0) * 1000;
    const safeDuration = shouldReduceMotion
      ? 0
      : Math.min(Math.max(duration ?? 0, 0), 0.26) * 1000;
    const startTimer = window.setTimeout(() => onStart?.(), safeDelay);
    const endTimer = window.setTimeout(
      () => onEnd?.(),
      safeDelay + safeDuration,
    );
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(endTimer);
    };
  }, [delay, duration, onEnd, onStart, shouldReduceMotion, startWhen]);
}

function decimalPlaces(value: number) {
  const [, decimals = ""] = String(value).split(".");
  return decimals.replace(/0+$/, "").length;
}

function formatNumber(value: number, decimals: number, separator: string) {
  let formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
    useGrouping: Boolean(separator),
  }).format(value);

  if (separator === ".") {
    formatted = formatted
      .replace(/,/g, "__GROUP__")
      .replace(/\./g, ",")
      .replace(/__GROUP__/g, ".");
  } else if (separator) {
    formatted = formatted.replace(/,/g, separator);
  }
  return formatted;
}
