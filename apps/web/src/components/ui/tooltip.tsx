"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { createPortal } from "react-dom";

const TooltipContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
} | null>(null);

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLDivElement>(null);

  return (
    <TooltipContext.Provider value={{ open, setOpen, triggerRef }}>
      <div
        ref={triggerRef}
        className="relative inline-block"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {children}
      </div>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  return <>{children}</>;
}

export function TooltipContent({
  children,
  className,
  side = "top",
  align = "center",
  sideOffset = 8,
}: {
  children: React.ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}) {
  const context = React.useContext(TooltipContext);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useLayoutEffect(() => {
    if (context?.open && context.triggerRef.current && contentRef.current) {
      const triggerRect = context.triggerRef.current.getBoundingClientRect();
      const contentRect = contentRef.current.getBoundingClientRect();

      let top = 0;
      let left = 0;

      // Position logic
      if (side === "top") {
        top = triggerRect.top - contentRect.height - sideOffset;
        left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
      } else if (side === "bottom") {
        top = triggerRect.bottom + sideOffset;
        left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
      } else if (side === "left") {
        top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
        left = triggerRect.left - contentRect.width - sideOffset;
      } else if (side === "right") {
        top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
        left = triggerRect.right + sideOffset;
      }

      // Viewport collision detection
      const padding = 12;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (left < padding) left = padding;
      if (left + contentRect.width > viewportWidth - padding) {
        left = viewportWidth - contentRect.width - padding;
      }
      if (top < padding) top = padding;
      if (top + contentRect.height > viewportHeight - padding) {
        top = viewportHeight - contentRect.height - padding;
      }

      setPosition({
        top: top + window.scrollY,
        left: left + window.scrollX,
      });
    }
  }, [context?.open, side, align, sideOffset]);

  if (!context || !mounted) return null;

  return createPortal(
    <AnimatePresence>
      {context.open && (
        <motion.div
          ref={contentRef}
          initial={{
            opacity: 0,
            scale: 0.95,
            y: side === "top" ? 4 : side === "bottom" ? -4 : 0,
            x: side === "left" ? 4 : side === "right" ? -4 : 0,
          }}
          animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
          exit={{
            opacity: 0,
            scale: 0.95,
            y: side === "top" ? 4 : side === "bottom" ? -4 : 0,
            x: side === "left" ? 4 : side === "right" ? -4 : 0,
          }}
          style={{
            position: "absolute",
            top: position.top,
            left: position.left,
            pointerEvents: "none",
          }}
          className={cn(
            "z-[var(--z-index-tooltip)] rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground shadow-2xl w-max max-w-[240px] leading-relaxed border border-white/10",
            className,
          )}
        >
          {children}
          {/* Arrow */}
          <div
            className={cn(
              "absolute border-[5px] border-transparent",
              side === "top" &&
                "top-full left-1/2 -translate-x-1/2 border-t-primary",
              side === "bottom" &&
                "bottom-full left-1/2 -translate-x-1/2 border-b-primary",
              side === "left" &&
                "left-full top-1/2 -translate-y-1/2 border-l-primary",
              side === "right" &&
                "right-full top-1/2 -translate-y-1/2 border-r-primary",
            )}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
