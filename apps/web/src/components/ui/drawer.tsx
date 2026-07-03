"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Custom footer. When provided, replaces the default "Concluído" button. */
  footer?: React.ReactNode;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  footer,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end md:items-center md:justify-center p-0 md:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal / Drawer Wrapper */}
          <motion.div
            ref={drawerRef}
            initial={{ y: "100%", opacity: 1 }}
            animate={{
              y: 0,
              opacity: 1,
              transition: {
                type: "spring",
                damping: 32,
                stiffness: 350,
                mass: 0.8,
              },
            }}
            exit={{ y: "100%", opacity: 0 }}
            className={cn(
              // Common styles
              "relative bg-card shadow-2xl flex flex-col",
              // Mobile specific (Drawer)
              "w-full rounded-t-[2.5rem] border-t border-border/50 max-h-[92dvh] overflow-hidden",
              // Desktop specific (Modal)
              "md:rounded-[2.5rem] md:border md:border-border/50 md:max-w-2xl md:max-h-[85vh] md:w-full md:shadow-2xl",
              className,
            )}
          >
            {/* Grab Handle — Mobile only */}
            <div className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/20 mt-4 mb-2 shrink-0 md:hidden" />

            <div className="flex flex-col h-full overflow-hidden px-6 pb-8 pt-4 md:p-10 md:pt-10">
              {/* Header */}
              <div className="flex items-start justify-between mb-8 shrink-0">
                <div className="space-y-1">
                  {title && (
                    <h2 className="text-2xl font-bold font-display tracking-tight text-foreground leading-tight">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <div className="text-muted-foreground text-sm font-medium">
                      {description}
                    </div>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full p-2.5 text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-all active:scale-90"
                >
                  <X className="size-6" />
                </button>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar -mr-2">
                {children}
              </div>

              {/* Footer Actions */}
              <div className="mt-8 pt-4 shrink-0 flex gap-4">
                {footer ?? (
                  <button
                    onClick={onClose}
                    className="flex-1 bg-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-95"
                  >
                    Concluído
                  </button>
                )}
              </div>
            </div>

            {/* Respect Safe Areas Without Fixed Fallbacks That Create Gaps */}
            <div className="h-[env(safe-area-inset-bottom,0px)] shrink-0 md:hidden" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
