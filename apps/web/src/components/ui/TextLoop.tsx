import { gsap } from "gsap";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import "./TextLoop.css";

const VIEW_W = 1200;
const VIEW_H = 520;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;
const EDGE_PAD = 6;

type TextLoopShape = "arch" | "circle" | "infinity" | "line" | "wave";

export interface TextLoopProps {
  className?: string;
  color?: string;
  curviness?: number;
  direction?: "forward" | "reverse";
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  path?: string;
  pauseOnHover?: boolean;
  preserveAspectRatio?: string;
  ribbon?: boolean;
  ribbonColor?: string;
  ribbonWidth?: number;
  separator?: string;
  shape?: TextLoopShape;
  speed?: number;
  style?: CSSProperties;
  text?: string;
  uppercase?: boolean;
}

function buildPath(
  shape: TextLoopShape,
  curviness: number,
  ribbonWidth: number,
) {
  const c = Math.max(0, curviness);
  const room = Math.max(20, CY - Math.max(0, ribbonWidth) / 2 - EDGE_PAD);

  switch (shape) {
    case "circle": {
      const radius = Math.min(90 + c * 0.95, room);
      return `M ${CX - radius} ${CY} A ${radius} ${radius} 0 1 1 ${CX + radius} ${CY} A ${radius} ${radius} 0 1 1 ${CX - radius} ${CY} Z`;
    }
    case "infinity": {
      const radius = 150 + c * 1.4;
      const height = Math.min(60 + c * 0.95, room);
      return [
        `M ${CX} ${CY}`,
        `C ${CX + radius * 0.55} ${CY - height} ${CX + radius} ${CY - height} ${CX + radius} ${CY}`,
        `C ${CX + radius} ${CY + height} ${CX + radius * 0.55} ${CY + height} ${CX} ${CY}`,
        `C ${CX - radius * 0.55} ${CY - height} ${CX - radius} ${CY - height} ${CX - radius} ${CY}`,
        `C ${CX - radius} ${CY + height} ${CX - radius * 0.55} ${CY + height} ${CX} ${CY}`,
        "Z",
      ].join(" ");
    }
    case "arch": {
      const rise = Math.min(120 + c * 1.1, room * 2);
      return `M 120 ${CY + rise / 2} Q ${CX} ${CY - rise * 1.5} ${VIEW_W - 120} ${CY + rise / 2}`;
    }
    case "line":
      return `M -320 ${CY} L ${VIEW_W + 320} ${CY}`;
    case "wave":
    default: {
      const amplitude = Math.min(c * 2.2, room * 2);
      return `M -320 ${CY} Q -160 ${CY - amplitude} 0 ${CY} T 320 ${CY} T 640 ${CY} T 960 ${CY} T 1280 ${CY} T ${VIEW_W + 320} ${CY}`;
    }
  }
}

export default function TextLoop({
  className = "",
  color = "var(--color-accent-foreground)",
  curviness = 90,
  direction = "forward",
  fontSize = 46,
  fontWeight = 800,
  letterSpacing = 2,
  path,
  pauseOnHover = false,
  preserveAspectRatio = "xMidYMin slice",
  ribbon = true,
  ribbonColor = "var(--color-accent)",
  ribbonWidth = 86,
  separator = "✦",
  shape = "wave",
  speed = 90,
  style = {},
  text = "Loja Veículos",
  uppercase = true,
}: TextLoopProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const measureRef = useRef<SVGTextElement>(null);
  const textPathRef = useRef<SVGTextPathElement>(null);
  const [metrics, setMetrics] = useState({ length: 0, reps: 1, unitWidth: 0 });
  const rawId = useId();
  const pathId = `text-loop-${rawId.replace(/:/g, "")}`;
  const d = useMemo(
    () => path ?? buildPath(shape, curviness, ribbonWidth),
    [curviness, path, ribbonWidth, shape],
  );
  const unit = useMemo(() => {
    const base = uppercase ? String(text).toUpperCase() : String(text);
    const gap = separator ? `\u00A0${separator}\u00A0` : "\u00A0\u00A0\u00A0";
    return `${base}${gap}`;
  }, [separator, text, uppercase]);
  const textStyle = useMemo(
    () => ({
      fontSize: `${fontSize}px`,
      fontWeight,
      letterSpacing: `${letterSpacing}px`,
    }),
    [fontSize, fontWeight, letterSpacing],
  );

  useLayoutEffect(() => {
    const pathElement = pathRef.current;
    const measureElement = measureRef.current;
    if (!pathElement || !measureElement) return;
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      try {
        const length = pathElement.getTotalLength();
        const unitWidth = measureElement.getComputedTextLength();
        if (!length) return;
        const reps =
          unitWidth > 0
            ? Math.max(3, Math.ceil((length + unitWidth) / unitWidth) + 2)
            : 1;
        setMetrics((previous) =>
          previous.length === length &&
          previous.reps === reps &&
          previous.unitWidth === unitWidth
            ? previous
            : { length, reps, unitWidth },
        );
      } catch {
        // SVG measurement is unavailable in some non-browser renderers.
      }
    };

    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [d, fontSize, fontWeight, letterSpacing, unit]);

  useEffect(() => {
    const { unitWidth } = metrics;
    const textPath = textPathRef.current;
    if (!textPath || !unitWidth) return;
    const apply = (offset: number) =>
      textPath.setAttribute("startOffset", String(offset));
    const from = direction === "reverse" ? 0 : -unitWidth;
    const to = direction === "reverse" ? -unitWidth : 0;

    apply(from);
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      speed <= 0
    ) {
      return;
    }

    const state = { offset: from };
    const tween = gsap.to(state, {
      duration: unitWidth / speed,
      ease: "none",
      offset: to,
      onUpdate: () => apply(state.offset),
      repeat: -1,
    });
    const root = rootRef.current;
    const pause = () => {
      tween.pause();
    };
    const resume = () => {
      tween.resume();
    };
    if (pauseOnHover && root) {
      root.addEventListener("pointerenter", pause);
      root.addEventListener("pointerleave", resume);
    }

    return () => {
      tween.kill();
      if (pauseOnHover && root) {
        root.removeEventListener("pointerenter", pause);
        root.removeEventListener("pointerleave", resume);
      }
    };
  }, [direction, metrics, pauseOnHover, speed]);

  const loopText = unit.repeat(metrics.reps);

  return (
    <div
      ref={rootRef}
      className={`text-loop ${className}`.trim()}
      style={style}
    >
      <svg
        aria-hidden="true"
        className="text-loop-svg"
        preserveAspectRatio={preserveAspectRatio}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      >
        <path
          ref={pathRef}
          d={d}
          fill="none"
          id={pathId}
          stroke={ribbon ? ribbonColor : "none"}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={ribbon ? ribbonWidth : 0}
        />
        <text
          ref={measureRef}
          aria-hidden="true"
          className="text-loop-measure"
          style={textStyle}
        >
          {unit}
        </text>
        <text
          className="text-loop-text"
          dominantBaseline="central"
          fill={color}
          style={textStyle}
        >
          <textPath ref={textPathRef} href={`#${pathId}`} startOffset={0}>
            {loopText}
          </textPath>
        </text>
      </svg>
    </div>
  );
}
