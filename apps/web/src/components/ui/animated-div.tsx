"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

interface AnimatedDivProps extends HTMLMotionProps<"div"> {
  children?: React.ReactNode;
  delay?: number;
}

/**
 * A simple client-side wrapper for motion.div to be used in Server Components
 * with standard high-end entrance animations by default.
 */
export function AnimatedDiv({
  children,
  className,
  style,
  ...props
}: AnimatedDivProps) {
  return (
    <motion.div
      className={className}
      style={{ willChange: "transform, opacity", ...style }}
      initial={props.initial ?? { opacity: 0, y: 20 }}
      whileInView={props.whileInView ?? { opacity: 1, y: 0 }}
      viewport={props.viewport ?? { once: true, margin: "-50px" }}
      transition={
        props.transition ?? {
          duration: 0.5,
          ease: [0.21, 0.47, 0.32, 0.98],
          delay: props.delay ?? 0,
        }
      }
      {...props}
    >
      {children}
    </motion.div>
  );
}
