import type { ComponentStyleProps } from "@centroimovel/types";
import { Variants, type HTMLMotionProps } from "framer-motion";

export type AnimationType =
  | "none"
  | "fadeIn"
  | "fadeInUp"
  | "fadeInDown"
  | "slideInLeft"
  | "slideInRight"
  | "zoomIn"
  | "bounce";

export type HoverAnimationType = "none" | "scale" | "lift" | "glow" | "shake";

interface AnimationConfig {
  animation: AnimationType;
  duration?: number;
  delay?: number;
}

export function getAnimationVariant({
  animation,
  duration = 500,
  delay = 0,
}: AnimationConfig): Variants {
  if (animation === "none") return {};

  const delaySeconds = delay / 1000;
  const durationSeconds = duration / 1000;

  switch (animation) {
    case "fadeIn":
      return {
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { duration: durationSeconds, delay: delaySeconds },
        },
      };
    case "fadeInUp":
      return {
        hidden: { opacity: 0, y: 30 },
        show: {
          opacity: 1,
          y: 0,
          transition: {
            duration: durationSeconds,
            delay: delaySeconds,
            ease: "easeOut",
          },
        },
      };
    case "fadeInDown":
      return {
        hidden: { opacity: 0, y: -30 },
        show: {
          opacity: 1,
          y: 0,
          transition: {
            duration: durationSeconds,
            delay: delaySeconds,
            ease: "easeOut",
          },
        },
      };
    case "slideInLeft":
      return {
        hidden: { opacity: 0, x: -50 },
        show: {
          opacity: 1,
          x: 0,
          transition: {
            duration: durationSeconds,
            delay: delaySeconds,
            ease: "easeOut",
          },
        },
      };
    case "slideInRight":
      return {
        hidden: { opacity: 0, x: 50 },
        show: {
          opacity: 1,
          x: 0,
          transition: {
            duration: durationSeconds,
            delay: delaySeconds,
            ease: "easeOut",
          },
        },
      };
    case "zoomIn":
      return {
        hidden: { opacity: 0, scale: 0.8 },
        show: {
          opacity: 1,
          scale: 1,
          transition: {
            duration: durationSeconds,
            delay: delaySeconds,
            ease: "easeOut",
          },
        },
      };
    case "bounce":
      return {
        hidden: { opacity: 0, y: 50 },
        show: {
          opacity: 1,
          y: 0,
          transition: {
            duration: durationSeconds,
            delay: delaySeconds,
            ease: [0.34, 1.56, 0.64, 1],
          },
        },
      };
    default:
      return {};
  }
}

interface HoverAnimationConfig {
  animation: HoverAnimationType;
  scale?: number;
}

export function getHoverAnimation({
  animation,
  scale = 1.05,
}: HoverAnimationConfig): { whileHover: Record<string, unknown> } {
  switch (animation) {
    case "scale":
      return {
        whileHover: {
          scale: scale,
          transition: { duration: 0.2 },
        },
      };
    case "lift":
      return {
        whileHover: {
          y: -5,
          scale: scale,
          boxShadow: "0 10px 30px -5px rgba(0,0,0,0.2)",
          transition: { duration: 0.2 },
        },
      };
    case "glow":
      return {
        whileHover: {
          boxShadow: "0 0 20px 5px rgba(201, 168, 76, 0.5)",
          transition: { duration: 0.3 },
        },
      };
    case "shake":
      return {
        whileHover: {
          x: [-2, 2, -2, 2, 0],
          transition: { duration: 0.3 },
        },
      };
    default:
      return { whileHover: {} };
  }
}

interface GlowConfig {
  glowColor?: string;
  glowIntensity?: number;
  glowAnimated?: boolean;
}

/** Entrance + hover from `ComponentStyleProps` (used by `SectionSurface`). */
export function sectionMotionPropsFromStyle(
  style?: ComponentStyleProps,
): Partial<
  Pick<
    HTMLMotionProps<"div">,
    | "variants"
    | "initial"
    | "animate"
    | "whileInView"
    | "viewport"
    | "whileHover"
  >
> {
  const anim = (style?.animation as AnimationType) || "none";
  const hover = (style?.hoverAnimation as HoverAnimationType) || "none";
  const variants = getAnimationVariant({
    animation: anim,
    duration: style?.animationDuration ?? 500,
    delay: style?.animationDelay ?? 0,
  });
  const entrance = anim !== "none";
  const hoverCfg = getHoverAnimation({
    animation: hover,
    scale: style?.hoverScale ?? 1.05,
  }).whileHover as HTMLMotionProps<"div">["whileHover"];
  const hasHover =
    hover !== "none" && hoverCfg && Object.keys(hoverCfg).length > 0;

  return {
    ...(entrance
      ? {
          variants,
          initial: "hidden" as const,
          whileInView: "show" as const,
          viewport: { once: true } as const,
        }
      : {}),
    ...(hasHover ? { whileHover: hoverCfg } : {}),
  };
}

export function getGlowStyle(
  glowColor?: string,
  glowIntensity: number = 0,
  animated: boolean = false,
): React.CSSProperties {
  if (!glowColor || glowIntensity === 0) return {};

  const blur = glowIntensity;
  const spread = glowIntensity / 2;

  if (animated) {
    return {
      boxShadow: `0 0 ${blur}px ${spread}px ${glowColor}`,
      animation: "pulse-glow 2s ease-in-out infinite",
    };
  }

  return {
    boxShadow: `0 0 ${blur}px ${spread}px ${glowColor}`,
  };
}

export const GLOBAL_ANIMATION_CSS = `
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 20px 5px var(--glow-color, rgba(201, 168, 76, 0.5));
  }
  50% {
    box-shadow: 0 0 40px 15px var(--glow-color, rgba(201, 168, 76, 0.5));
  }
}
`;
