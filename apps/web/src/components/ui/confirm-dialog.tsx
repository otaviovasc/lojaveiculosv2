"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  activateModalLayer,
  focusDialogTarget,
  trapDialogFocus,
} from "./dialog-accessibility";

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
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const descriptionId = useId();
  const isLoadingRef = useRef(isLoading);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    isLoadingRef.current = isLoading;
    onCloseRef.current = onClose;
  }, [isLoading, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const layer = activateModalLayer();
    const cancelFocus = focusDialogTarget(
      () => dialogRef.current,
      () => cancelButtonRef.current,
    );
    const handleEscape = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        isLoadingRef.current ||
        !layer.isTopLayer()
      ) {
        return;
      }
      event.preventDefault();
      onCloseRef.current();
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      cancelFocus();
      window.removeEventListener("keydown", handleEscape);
      layer.release();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen]);

  const handleConfirm = async () => {
    await onConfirm();
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isLoading ? undefined : onClose}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm cursor-pointer"
          />
          <motion.div
            aria-describedby={description ? descriptionId : undefined}
            aria-labelledby={titleId}
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md rounded-2xl border border-border/50 bg-card p-6 shadow-lg"
            onKeyDown={(event) => trapDialogFocus(event, dialogRef.current)}
            ref={dialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <h2
              className="text-lg font-bold font-display tracking-tight text-foreground"
              id={titleId}
            >
              {title}
            </h2>
            {description && (
              <p
                className="mt-2 text-sm text-muted-foreground"
                id={descriptionId}
              >
                {description}
              </p>
            )}
            {error && (
              <div
                aria-live="assertive"
                className="mt-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive"
                role="alert"
              >
                {error}
              </div>
            )}
            <div className="mt-6 flex gap-3 justify-end">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
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
                    : "rounded-xl px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
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
