import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cx } from "./featureShared";

export function FeatureDialog({
  children,
  className,
  footer,
  isOpen,
  onClose,
  title,
}: {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
}) {
  useOverlayEffects(isOpen, onClose);
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4">
      <button
        aria-label="Fechar dialogo"
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <section
        className={cx(
          "relative flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)] animate-fade-in sm:max-h-[calc(100dvh-2rem)]",
          className ?? "max-w-xl",
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line p-4">
          <h3 className="min-w-0 text-lg font-black leading-tight text-app-text">
            {title}
          </h3>
          <button
            aria-label="Fechar"
            className="shrink-0 rounded-lg border border-line bg-app p-2 text-muted hover:text-app-text"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 scroll-pb-6 overflow-y-auto p-4 pb-6">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-line p-4">{footer}</div>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}

export function FeatureDialogActions({
  cancelDisabled,
  cancelLabel = "Cancelar",
  confirmDisabled,
  confirmIcon,
  confirmLabel,
  isLoading,
  loadingLabel = "Salvando",
  onCancel,
  onConfirm,
  variant = "primary",
}: {
  cancelDisabled?: boolean;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  confirmIcon?: ReactNode;
  confirmLabel: string;
  isLoading?: boolean;
  loadingLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  variant?: "danger" | "primary";
}) {
  return (
    <div className="flex flex-col justify-end gap-2 sm:flex-row">
      <button
        className="min-h-11 rounded-lg border border-line bg-app px-4 text-sm font-black text-app-text"
        disabled={isLoading || cancelDisabled}
        onClick={onCancel}
        type="button"
      >
        {cancelLabel}
      </button>
      <button
        className={cx(
          "flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black text-inverse disabled:opacity-60",
          variant === "danger"
            ? "bg-danger hover:bg-danger-hover"
            : "bg-accent hover:bg-accent-strong",
        )}
        disabled={isLoading || confirmDisabled}
        onClick={onConfirm}
        type="button"
      >
        {confirmIcon}
        {isLoading ? loadingLabel : confirmLabel}
      </button>
    </div>
  );
}

export function FeatureDrawer({
  children,
  className,
  footer,
  isOpen,
  onClose,
  title,
}: {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
}) {
  useOverlayEffects(isOpen, onClose);
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Fechar painel"
        className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
        onClick={onClose}
        type="button"
      />
      <aside
        className={cx(
          "absolute right-0 top-0 flex h-full w-[420px] max-w-[95vw] flex-col border-l border-line bg-panel text-app-text shadow-2xl",
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-line p-6">
          <h3 className="text-base font-black uppercase tracking-wider">
            {title}
          </h3>
          <button
            className="text-sm font-black text-muted hover:text-app-text"
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-line bg-panel/95 p-6">
            {footer}
          </div>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}

function useOverlayEffects(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);
}
