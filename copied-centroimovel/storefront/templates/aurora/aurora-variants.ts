import type { Variants } from "framer-motion";

export const auroraFadeIn = (
  direction: "up" | "down" | "left" | "right",
  delay = 0,
): Variants => ({
  hidden: {
    opacity: 0,
    y: direction === "up" ? 30 : direction === "down" ? -30 : 0,
    x: direction === "left" ? 30 : direction === "right" ? -30 : 0,
  },
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      duration: 0.8,
      delay,
      ease: [0.21, 1, 0.36, 1],
    },
  },
});

export const auroraStagger = (
  staggerChildren = 0.1,
  delayChildren = 0,
): Variants => ({
  hidden: {},
  show: {
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});
