"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  isLoading?: boolean;
  loadingLabel?: string;
  error?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  isLoading = false,
  loadingLabel = "Salvando…",
  error,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, isLoading]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const handleConfirm = async () => {
    await onConfirm();
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isLoading ? undefined : onClose}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md rounded-2xl border border-border/50 bg-card p-6 shadow-lg"
          >
            <h2 className="text-lg font-bold font-display tracking-tight text-foreground">
              {title}
            </h2>
            {description && (
              <p className="mt-2 text-sm text-muted-foreground">
                {description}
              </p>
            )}
            {error && (
              <div className="mt-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleConfirm();
                }}
                disabled={isLoading}
                className={
                  variant === "destructive"
                    ? "rounded-xl px-4 py-2.5 text-sm font-medium text-destructive-foreground bg-destructive hover:bg-destructive/90 transition-colors disabled:opacity-50"
                    : "rounded-xl px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-md hover:shadow-lg"
                }
              >
                {isLoading ? loadingLabel : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
