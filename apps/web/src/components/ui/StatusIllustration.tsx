import { cx } from "./featureShared";

export type StatusIllustrationVariant =
  "empty-lot" | "gate" | "lost-car" | "offline" | "open-hood";

/**
 * Theme-aware status scenes drawn only with design-token colors so they
 * follow light/dark themes and the tenant accent. Rendered aria-hidden;
 * nearby copy always carries the meaning.
 */
export function StatusIllustration({
  className,
  variant,
}: {
  className?: string;
  variant: StatusIllustrationVariant;
}) {
  return (
    <svg
      aria-hidden="true"
      className={cx("status-illustration", className)}
      focusable="false"
      role="presentation"
      viewBox="0 0 320 200"
    >
      {variant === "lost-car" ? <LostCarScene /> : null}
      {variant === "open-hood" ? <OpenHoodScene /> : null}
      {variant === "gate" ? <GateScene /> : null}
      {variant === "empty-lot" ? <EmptyLotScene /> : null}
      {variant === "offline" ? <OfflineScene /> : null}
    </svg>
  );
}

function StatusCar({
  body = "var(--status-illustration-car, var(--color-accent))",
  x,
  y,
}: {
  body?: string;
  x: number;
  y: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M8 36 C8 27 14 24 22 23 L34 12 C37 9 41 8 46 8 L74 8 C80 8 85 10 89 14 L98 24 C108 26 112 30 112 36 L112 39 C112 42 110 44 107 44 L97 44 A13 13 0 0 0 71 44 L49 44 A13 13 0 0 0 23 44 L13 44 C10 44 8 42 8 39 Z"
        fill={body}
      />
      <path
        d="M38 13 L47 11 L71 11 L81 22 L36 22 Z"
        fill="var(--color-panel)"
        opacity="0.85"
      />
      <circle cx="36" cy="44" fill="var(--color-line-strong)" r="9" />
      <circle cx="36" cy="44" fill="var(--color-panel)" r="3.5" />
      <circle cx="84" cy="44" fill="var(--color-line-strong)" r="9" />
      <circle cx="84" cy="44" fill="var(--color-panel)" r="3.5" />
    </g>
  );
}

function LostCarScene() {
  return (
    <>
      <ellipse
        cx="70"
        cy="38"
        fill="var(--color-muted)"
        opacity="0.16"
        rx="26"
        ry="10"
      />
      <ellipse
        cx="238"
        cy="30"
        fill="var(--color-muted)"
        opacity="0.12"
        rx="20"
        ry="8"
      />
      <path
        d="M-8 176 C 56 176 74 136 134 136 S 226 158 268 124"
        fill="none"
        stroke="var(--color-line-strong)"
        strokeLinecap="round"
        strokeWidth="26"
      />
      <path
        d="M-8 176 C 56 176 74 136 134 136 S 226 158 268 124"
        fill="none"
        stroke="var(--color-panel)"
        strokeDasharray="12 14"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <StatusCar x={112} y={88} />
      <g transform="translate(268 62)">
        <rect
          fill="var(--color-line-strong)"
          height="46"
          rx="3"
          width="6"
          x="9"
          y="22"
        />
        <rect
          fill="var(--color-panel)"
          height="34"
          rx="9"
          stroke="var(--color-warning-strong)"
          strokeWidth="3"
          width="46"
          x="-11"
          y="-6"
        />
        <text
          fill="var(--color-warning-strong)"
          fontFamily="var(--font-display)"
          fontSize="24"
          fontWeight="900"
          textAnchor="middle"
          x="12"
          y="20"
        >
          ?
        </text>
      </g>
      <g transform="translate(296 132) rotate(18)">
        <path
          d="M0 0 C -9 0 -15 7 -15 14 C -15 24 0 34 0 34 C 0 34 15 24 15 14 C 15 7 9 0 0 0 Z"
          fill="var(--color-danger)"
          opacity="0.9"
        />
        <circle cx="0" cy="14" fill="var(--color-panel)" r="5" />
      </g>
    </>
  );
}

function OpenHoodScene() {
  return (
    <>
      <rect
        fill="var(--color-line)"
        height="4"
        rx="2"
        width="320"
        x="0"
        y="168"
      />
      <StatusCar x={96} y={116} />
      <path
        d="M206 130 L236 100 L244 107 L214 137 Z"
        fill="var(--color-accent-strong)"
      />
      <circle cx="242" cy="88" fill="var(--color-muted)" opacity="0.35" r="7" />
      <circle
        cx="252"
        cy="70"
        fill="var(--color-muted)"
        opacity="0.25"
        r="10"
      />
      <circle cx="244" cy="50" fill="var(--color-muted)" opacity="0.18" r="6" />
      <g transform="translate(52 124)">
        <path
          d="M20 0 L40 36 L0 36 Z"
          fill="var(--color-warning)"
          opacity="0.92"
          stroke="var(--color-warning-strong)"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        <text
          fill="var(--color-panel)"
          fontFamily="var(--font-display)"
          fontSize="20"
          fontWeight="900"
          textAnchor="middle"
          x="20"
          y="31"
        >
          !
        </text>
      </g>
    </>
  );
}

function GateScene() {
  return (
    <>
      <rect
        fill="var(--color-line)"
        height="4"
        rx="2"
        width="320"
        x="0"
        y="168"
      />
      <StatusCar body="var(--color-line-strong)" x={40} y={116} />
      <rect
        fill="var(--color-line-strong)"
        height="76"
        rx="5"
        width="12"
        x="196"
        y="92"
      />
      <g transform="rotate(-10 202 100)">
        <rect
          fill="var(--color-panel)"
          height="10"
          rx="5"
          stroke="var(--color-line-strong)"
          strokeWidth="2"
          width="132"
          x="70"
          y="95"
        />
        <rect
          fill="var(--color-warning)"
          height="10"
          width="16"
          x="84"
          y="95"
        />
        <rect
          fill="var(--color-warning)"
          height="10"
          width="16"
          x="116"
          y="95"
        />
        <rect
          fill="var(--color-warning)"
          height="10"
          width="16"
          x="148"
          y="95"
        />
      </g>
      <g transform="translate(202 82)">
        <rect
          fill="var(--color-accent)"
          height="18"
          rx="5"
          width="24"
          x="-12"
          y="-2"
        />
        <path
          d="M-6 -2 L-6 -8 A6 6 0 0 1 6 -8 L6 -2"
          fill="none"
          stroke="var(--color-accent-strong)"
          strokeWidth="4"
        />
        <circle cx="0" cy="7" fill="var(--color-panel)" r="3" />
      </g>
    </>
  );
}

function EmptyLotScene() {
  return (
    <>
      <rect
        fill="var(--color-app-elevated)"
        height="58"
        width="320"
        x="0"
        y="142"
      />
      {[28, 106, 184].map((x) => (
        <rect
          key={x}
          fill="none"
          height="52"
          rx="6"
          stroke="var(--color-line-strong)"
          strokeDasharray="7 7"
          strokeWidth="3"
          width="62"
          x={x}
          y={112}
        />
      ))}
      <g transform="translate(264 58)">
        <rect
          fill="var(--color-line-strong)"
          height="84"
          rx="3"
          width="6"
          x="12"
          y="34"
        />
        <rect
          fill="var(--color-blue-start)"
          height="40"
          rx="9"
          width="42"
          x="-6"
          y="-2"
        />
        <text
          fill="var(--color-panel)"
          fontFamily="var(--font-display)"
          fontSize="24"
          fontWeight="900"
          textAnchor="middle"
          x="15"
          y="27"
        >
          P
        </text>
      </g>
      <g transform="translate(56 150)" opacity="0.7">
        <circle
          cx="0"
          cy="0"
          fill="none"
          r="13"
          stroke="var(--color-muted)"
          strokeWidth="3"
        />
        <path
          d="M-9 -9 L9 9 M-9 9 L9 -9 M0 -13 L0 13"
          stroke="var(--color-muted)"
          strokeLinecap="round"
          strokeWidth="2.5"
        />
      </g>
    </>
  );
}

function OfflineScene() {
  return (
    <>
      <rect
        fill="var(--color-line)"
        height="4"
        rx="2"
        width="320"
        x="0"
        y="176"
      />
      <g transform="translate(60 40)">
        <path
          d="M22 58 C6 58 -4 46 2 33 C6 23 16 19 25 20 C29 8 41 0 54 0 C70 0 82 12 83 27 C94 28 102 37 102 47 C102 58 93 66 82 66 L22 66 Z"
          fill="var(--color-app-elevated)"
          stroke="var(--color-line-strong)"
          strokeWidth="3"
        />
        <path
          d="M12 78 L96 6"
          stroke="var(--color-danger)"
          strokeLinecap="round"
          strokeWidth="6"
        />
      </g>
      <path
        d="M118 118 C 118 150 156 138 176 152"
        fill="none"
        stroke="var(--color-line-strong)"
        strokeDasharray="8 8"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <StatusCar x={176} y={120} />
      <g transform="translate(176 140) rotate(-24)">
        <rect
          fill="var(--color-line-strong)"
          height="14"
          rx="3"
          width="10"
          x="-5"
          y="0"
        />
        <rect
          fill="var(--color-line-strong)"
          height="8"
          rx="2"
          width="3"
          x="-8"
          y="14"
        />
        <rect
          fill="var(--color-line-strong)"
          height="8"
          rx="2"
          width="3"
          x="5"
          y="14"
        />
      </g>
    </>
  );
}
