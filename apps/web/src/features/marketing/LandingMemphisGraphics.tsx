import { CarFront, Cog, Flame, Gauge } from "lucide-react";
import { cn } from "../../lib/utils";

export * from "./LandingFeatureWatermarks";

export function MemphisSquiggle({
  className = "w-24 h-6 text-red-500",
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 120 24"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12 Q 18 2 32 12 T 60 12 T 88 12 T 116 12" />
    </svg>
  );
}

export function MemphisZigZag({
  className = "w-24 h-4 text-red-500",
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 100 16"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <path d="M2 14 L 14 2 L 26 14 L 38 2 L 50 14 L 62 2 L 74 14 L 86 2 L 98 14" />
    </svg>
  );
}

export function MemphisPlusGrid({
  className = "text-muted/30",
  rows = 3,
  cols = 3,
}: {
  className?: string;
  rows?: number;
  cols?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "inline-grid select-none gap-x-4 gap-y-3 font-mono text-xs font-bold leading-none",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: rows * cols }).map((_, i) => (
        <span key={i} className="flex items-center justify-center">
          +
        </span>
      ))}
    </div>
  );
}

export function MemphisDotMatrix({
  className = "text-muted/30",
  rows = 4,
  cols = 5,
}: {
  className?: string;
  rows?: number;
  cols?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("inline-grid select-none gap-2", className)}
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: rows * cols }).map((_, i) => (
        <span key={i} className="size-1 rounded-full bg-current" />
      ))}
    </div>
  );
}

export function MemphisCrosshair({
  className = "size-5 text-red-500",
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="8" strokeWidth="1.5" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round" />
    </svg>
  );
}

export function MemphisHatch({
  className = "w-16 h-12 text-muted/20",
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 64 48"
    >
      <defs>
        <pattern
          id="memphis-hatch-pattern"
          width="8"
          height="8"
          patternTransform="rotate(45 0 0)"
          patternUnits="userSpaceOnUse"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="8"
            stroke="currentColor"
            strokeWidth="2"
          />
        </pattern>
      </defs>
      <rect width="64" height="48" fill="url(#memphis-hatch-pattern)" />
    </svg>
  );
}

export function MemphisConcentric({
  className = "size-28 text-muted/20",
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 100 100"
      stroke="currentColor"
    >
      <circle cx="50" cy="50" r="45" strokeWidth="1.5" strokeDasharray="4 4" />
      <circle cx="50" cy="50" r="32" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="18" strokeWidth="1.5" strokeDasharray="2 2" />
      <circle cx="50" cy="50" r="4" fill="currentColor" />
    </svg>
  );
}

export function MemphisStarburst({
  className = "size-8 text-red-500",
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
    </svg>
  );
}

/* --- Pure Lucide Automotive Icons (NO Card/Box wrapper) --- */

export function MemphisCarIcon({
  className = "size-8 text-red-500",
}: {
  className?: string;
}) {
  return (
    <CarFront aria-hidden="true" className={className} strokeWidth={1.75} />
  );
}

export function MemphisGearIcon({
  className = "size-8 text-red-500 animate-[spin_16s_linear_infinite]",
}: {
  className?: string;
}) {
  return <Cog aria-hidden="true" className={className} strokeWidth={1.75} />;
}

export function MemphisGaugeIcon({
  className = "size-8 text-red-500",
}: {
  className?: string;
}) {
  return <Gauge aria-hidden="true" className={className} strokeWidth={1.75} />;
}

export function MemphisTurboIcon({
  className = "size-8 text-red-500",
}: {
  className?: string;
}) {
  return <Flame aria-hidden="true" className={className} strokeWidth={1.75} />;
}

export function MemphisCheckered({
  className = "w-20 h-6 text-muted/30",
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "inline-grid grid-cols-6 grid-rows-2 gap-0.5 select-none",
        className,
      )}
    >
      {Array.from({ length: 12 }).map((_, i) => {
        const isFilled = (Math.floor(i / 6) + (i % 6)) % 2 === 0;
        return (
          <span
            key={i}
            className={cn(
              "size-2.5",
              isFilled
                ? "bg-current"
                : "border border-current/20 bg-transparent",
            )}
          />
        );
      })}
    </div>
  );
}

/* --- Dynamic Racing Checkered Ribbon --- */

export function MemphisSpeedCheckered({
  className = "w-32 text-current opacity-40",
  skew = true,
  cols = 8,
}: {
  className?: string;
  skew?: boolean;
  cols?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "inline-flex flex-col gap-0.5 select-none",
        skew && "-skew-x-12",
        className,
      )}
    >
      <div className="flex gap-0.5">
        {Array.from({ length: cols }).map((_, i) => (
          <span
            key={`c1-${i}`}
            className={cn(
              "size-2.5 sm:size-3 rounded-[1px] transition-colors",
              i % 2 === 0
                ? "bg-current"
                : "border border-current/30 bg-transparent",
            )}
          />
        ))}
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: cols }).map((_, i) => (
          <span
            key={`c2-${i}`}
            className={cn(
              "size-2.5 sm:size-3 rounded-[1px] transition-colors",
              i % 2 !== 0
                ? "bg-current"
                : "border border-current/30 bg-transparent",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* --- Automotive RPM Tachometer Arc --- */

export function MemphisTachometerArc({
  className = "size-28 text-white/40",
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
    >
      {/* Outer Dial Arc */}
      <path
        d="M 18 80 A 42 42 0 1 1 82 80"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Redline Zone Accent */}
      <path
        d="M 68 28 A 42 42 0 0 1 82 80"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="opacity-90"
      />
      {/* Inner Dotted Speed Arc */}
      <path
        d="M 28 76 A 30 30 0 1 1 72 76"
        strokeWidth="1.5"
        strokeDasharray="3 3"
        strokeOpacity="0.4"
      />
      {/* Radial Ticks */}
      <line x1="18" y1="80" x2="25" y2="76" strokeWidth="2" />
      <line x1="13" y1="50" x2="21" y2="50" strokeWidth="2" />
      <line x1="25" y1="25" x2="31" y2="31" strokeWidth="2" />
      <line x1="50" y1="13" x2="50" y2="21" strokeWidth="2" />
      <line x1="75" y1="25" x2="69" y2="31" strokeWidth="2" />
      <line x1="87" y1="50" x2="79" y2="50" strokeWidth="2" />
      {/* Center Pivot */}
      <circle cx="50" cy="62" r="5" fill="currentColor" />
      {/* Needle pointing to high RPM */}
      <line
        x1="50"
        y1="62"
        x2="72"
        y2="34"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <text
        x="50"
        y="82"
        textAnchor="middle"
        fontSize="7"
        fontFamily="monospace"
        fontWeight="bold"
        fill="currentColor"
        stroke="none"
      >
        RPM x1000
      </text>
    </svg>
  );
}

/* --- Architectural Corner Bracket --- */

export function MemphisCornerBracket({
  className = "size-3 text-red-500",
  position = "top-left",
}: {
  className?: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) {
  const rotation = {
    "top-left": "",
    "top-right": "rotate-90",
    "bottom-right": "rotate-180",
    "bottom-left": "-rotate-90",
  }[position];

  return (
    <svg
      aria-hidden="true"
      className={cn("transition-all duration-300", rotation, className)}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M1 11V1H11" />
    </svg>
  );
}

/* --- Memphis Telemetry Stamped Badge --- */

export function MemphisTelemetryBadge({
  code = "01 // RPM",
  className = "",
}: {
  code?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "inline-flex items-center gap-1.5 border border-current/30 px-2 py-0.5 font-mono text-xs font-bold tracking-widest uppercase select-none rounded-[2px]",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current animate-pulse" />
      <span>{code}</span>
    </div>
  );
}

/* --- Classic Le Mans Dual Racing Stripe Livery Divider --- */

export function RacingStripeDivider({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex w-full select-none flex-col gap-1 border-y border-line/40 bg-app-elevated/20 py-1.5",
        className,
      )}
    >
      {/* Primary Bold Le Mans Racing Stripe */}
      <div className="h-2 w-full bg-red-600 shadow-sm" />
      {/* Parallel Secondary Speed Pinstripe */}
      <div className="h-0.5 w-full bg-red-600/60" />
    </div>
  );
}
