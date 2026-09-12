import { type SVGProps } from "react";
import "../../styles/morphicon.css";

export type MorphiconName =
  | "play-pause"
  | "check-cross"
  | "search-close"
  | "mail-read-unread"
  | "volume-mute"
  | "check";

export type MorphiconProps = {
  name: MorphiconName;
  active?: boolean;
  size?: number | string;
  className?: string;
  title?: string;
  "aria-hidden"?: boolean | "true" | "false";
} & Omit<SVGProps<SVGSVGElement>, "name">;

export function Morphicon({
  name,
  active = false,
  size = 16,
  className = "",
  title,
  "aria-hidden": ariaHidden = true,
  ...rest
}: MorphiconProps) {
  if (name === "play-pause") {
    return (
      <svg
        aria-hidden={ariaHidden}
        className={`morphicon morphicon-play-pause ${active ? "is-active" : ""} ${className}`}
        fill="currentColor"
        height={size}
        viewBox="0 0 24 24"
        width={size}
        {...rest}
      >
        {title ? <title>{title}</title> : null}
        <path
          className="morph-path-left"
          d={active ? "M6 4h3.5v16H6z" : "M7 4.5l6.5 4.5v6.5l-6.5 4.5z"}
        />
        <path
          className="morph-path-right"
          d={active ? "M14.5 4H18v16h-3.5z" : "M13.5 9l5.5 3.5v0l-5.5 3.5z"}
        />
      </svg>
    );
  }

  if (name === "check-cross") {
    return (
      <svg
        aria-hidden={ariaHidden}
        className={`morphicon morphicon-check-cross ${active ? "is-active" : ""} ${className}`}
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.25"
        viewBox="0 0 24 24"
        width={size}
        {...rest}
      >
        {title ? <title>{title}</title> : null}
        <line
          className="morph-line-1"
          x1={active ? "5" : "4"}
          y1={active ? "5" : "12"}
          x2={active ? "19" : "9"}
          y2={active ? "19" : "17"}
        />
        <line
          className="morph-line-2"
          x1={active ? "19" : "9"}
          y1={active ? "5" : "17"}
          x2={active ? "5" : "20"}
          y2={active ? "19" : "6"}
        />
      </svg>
    );
  }

  if (name === "search-close") {
    return (
      <svg
        aria-hidden={ariaHidden}
        className={`morphicon morphicon-search-close ${active ? "is-active" : ""} ${className}`}
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width={size}
        {...rest}
      >
        {title ? <title>{title}</title> : null}
        <circle
          className="morph-circle"
          cx="11"
          cy="11"
          r={active ? "0.1" : "7"}
          opacity={active ? 0 : 1}
        />
        <line
          className="morph-handle"
          x1={active ? "6" : "16"}
          y1={active ? "6" : "16"}
          x2={active ? "18" : "21"}
          y2={active ? "18" : "21"}
        />
        <line
          className="morph-cross"
          x1="18"
          y1="6"
          x2="6"
          y2="18"
          opacity={active ? 1 : 0}
        />
      </svg>
    );
  }

  if (name === "mail-read-unread") {
    return (
      <svg
        aria-hidden={ariaHidden}
        className={`morphicon morphicon-mail ${active ? "is-active" : ""} ${className}`}
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width={size}
        {...rest}
      >
        {title ? <title>{title}</title> : null}
        <rect height="16" rx="2" width="20" x="2" y="4" />
        <path
          className="morph-envelope-flap"
          d={
            active
              ? "M22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
              : "M2 7l10 7 10-7"
          }
        />
      </svg>
    );
  }

  if (name === "volume-mute") {
    return (
      <svg
        aria-hidden={ariaHidden}
        className={`morphicon morphicon-volume ${active ? "is-active" : ""} ${className}`}
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width={size}
        {...rest}
      >
        {title ? <title>{title}</title> : null}
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path
          className="morph-volume-wave-1"
          d="M15.54 8.46a5 5 0 0 1 0 7.07"
          opacity={active ? 0 : 1}
        />
        <path
          className="morph-volume-wave-2"
          d="M19.07 4.93a10 10 0 0 1 0 14.14"
          opacity={active ? 0 : 1}
        />
        <line
          className="morph-mute-line"
          x1="22"
          y1="9"
          x2="16"
          y2="15"
          opacity={active ? 1 : 0}
        />
        <line
          className="morph-mute-line"
          x1="16"
          y1="9"
          x2="22"
          y2="15"
          opacity={active ? 1 : 0}
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden={ariaHidden}
      className={`morphicon morphicon-check ${active ? "is-active" : ""} ${className}`}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.25"
      viewBox="0 0 24 24"
      width={size}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
