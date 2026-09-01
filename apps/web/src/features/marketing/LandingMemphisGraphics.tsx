import {
  Activity,
  Car,
  CarFront,
  CircleDot,
  Cog,
  Compass,
  Flame,
  Gauge,
  Sparkles,
  Workflow,
  Wrench,
  Zap,
} from "lucide-react";

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
  className = "text-white/20",
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
      className={`inline-grid select-none gap-x-4 gap-y-3 font-mono text-xs font-bold leading-none ${className}`}
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
  className = "text-white/20",
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
      className={`inline-grid select-none gap-2 ${className}`}
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
  className = "w-16 h-12 text-white/10",
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
  className = "size-28 text-white/10",
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

/* --- Automotive & Gearhead Vector Badges from Lucide System --- */

export function MemphisCarBadge({
  className = "size-10 text-red-500",
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-lg border border-current/25 bg-current/5 p-2 ${className}`}
    >
      <CarFront className="size-full" strokeWidth={2} />
    </div>
  );
}

export function MemphisGearBadge({
  className = "size-10 text-red-500",
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-lg border border-current/25 bg-current/5 p-2 ${className}`}
    >
      <Cog
        className="size-full animate-[spin_12s_linear_infinite]"
        strokeWidth={2}
      />
    </div>
  );
}

export function MemphisGaugeBadge({
  className = "size-10 text-red-500",
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-lg border border-current/25 bg-current/5 p-2 ${className}`}
    >
      <Gauge className="size-full" strokeWidth={2} />
    </div>
  );
}

export function MemphisTurboBadge({
  className = "size-10 text-red-500",
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-lg border border-current/25 bg-current/5 p-2 ${className}`}
    >
      <Flame className="size-full" strokeWidth={2} />
    </div>
  );
}

export function MemphisCheckered({
  className = "w-20 h-6 text-white/30",
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`inline-grid grid-cols-6 grid-rows-2 gap-0.5 select-none ${className}`}
    >
      {Array.from({ length: 12 }).map((_, i) => {
        const isFilled = (Math.floor(i / 6) + (i % 6)) % 2 === 0;
        return (
          <span
            key={i}
            className={
              isFilled
                ? "size-2.5 bg-current"
                : "size-2.5 border border-current/20 bg-transparent"
            }
          />
        );
      })}
    </div>
  );
}
