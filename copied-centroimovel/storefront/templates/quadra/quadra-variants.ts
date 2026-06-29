import type { Variants } from "framer-motion";

export const quadraFadeIn = (
  direction: "up" | "down" | "left" | "right",
  delay = 0,
): Variants => ({
  hidden: {
    opacity: 0,
    y: direction === "up" ? 20 : direction === "down" ? -20 : 0,
    x: direction === "left" ? 24 : direction === "right" ? -24 : 0,
  },
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      duration: 0.55,
      delay,
      ease: [0.21, 1, 0.36, 1],
    },
  },
});

export const quadraStagger = (
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
