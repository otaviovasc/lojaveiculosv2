import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cx } from "./featureShared";
import { useOverlayFocus } from "./useOverlayFocus";

export function FeatureDialog({
  children,
  className,
  description,
  footer,
  isOpen,
  onClose,
  title,
}: {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
}) {
  const descriptionId = useId();
  const titleId = useId();
  const dialogRef = useOverlayEffects<HTMLElement>(isOpen, onClose);
  if (!isOpen) return null;

  return createPortal(
    <div className="feature-overlay">
      <button
        aria-label="Fechar dialogo"
        className="feature-overlay__backdrop"
        onClick={onClose}
        type="button"
      />
      <section
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cx("feature-dialog", className ?? "feature-dialog--medium")}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="feature-dialog__header">
          <h3 className="feature-dialog__title" id={titleId}>
            {title}
          </h3>
          <button
            aria-label="Fechar"
            className="feature-dialog__close"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="feature-dialog__body">
          {description ? (
            <p
              className="mb-4 text-sm font-bold leading-relaxed text-muted"
              id={descriptionId}
            >
              {description}
            </p>
          ) : null}
          {children}
        </div>
        {footer ? <div className="feature-dialog__footer">{footer}</div> : null}
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
    <div className="feature-dialog-actions">
      <button
        className="feature-action feature-action--secondary"
        disabled={isLoading || cancelDisabled}
        onClick={onCancel}
        type="button"
      >
        {cancelLabel}
      </button>
      <button
        className={cx(
          "feature-action feature-action--primary",
          variant === "danger" ? "feature-action--danger" : undefined,
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
  const titleId = useId();
  const drawerRef = useOverlayEffects<HTMLElement>(isOpen, onClose);
  if (!isOpen) return null;

  return createPortal(
    <div className="feature-overlay feature-overlay--drawer">
      <button
        aria-label="Fechar painel"
        className="feature-overlay__backdrop"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-labelledby={titleId}
        aria-modal="true"
        className={cx("feature-drawer", className)}
        ref={drawerRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="feature-drawer__header">
          <h3 className="feature-drawer__title" id={titleId}>
            {title}
          </h3>
          <button
            aria-label="Fechar"
            className="feature-drawer__close"
            onClick={onClose}
            title="Fechar"
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="feature-drawer__body">{children}</div>
        {footer ? <div className="feature-drawer__footer">{footer}</div> : null}
      </aside>
    </div>,
    document.body,
  );
}

function useOverlayEffects<T extends HTMLElement>(
  isOpen: boolean,
  onClose: () => void,
) {
  return useOverlayFocus<T>(isOpen, onClose);
}
