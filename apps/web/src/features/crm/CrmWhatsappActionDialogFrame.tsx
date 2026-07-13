import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog";
import { cx } from "../../components/ui/featureShared";

export function CrmWhatsappActionDialogShell({
  children,
  onClose,
  panelClassName,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  panelClassName?: string;
  title: string;
}) {
  return (
    <Dialog
      containerClassName="p-4"
      onOpenChange={(open) => !open && onClose()}
      open
    >
      <DialogContent
        className={cx("max-w-none crm-whatsapp-action-panel", panelClassName)}
        padding="none"
        showCloseButton={false}
        surface="panel"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function ActionDialog({
  children,
  disabled,
  icon,
  onClose,
  onSubmit,
  title,
}: {
  children: ReactNode;
  disabled?: boolean;
  icon: ReactNode;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  title: string;
}) {
  return (
    <CrmWhatsappActionDialogShell onClose={onClose} title={title}>
      <header>
        <span>{icon}</span>
        <h2>{title}</h2>
        <button
          aria-label="Fechar"
          className="crm-icon-action"
          onClick={onClose}
          type="button"
        >
          <X />
        </button>
      </header>
      <div className="crm-whatsapp-action-fields">{children}</div>
      <footer>
        <button
          className="crm-action crm-action-muted"
          onClick={onClose}
          type="button"
        >
          Cancelar
        </button>
        <button
          className="crm-action"
          disabled={disabled}
          onClick={() => {
            if (!disabled) void onSubmit();
          }}
          type="button"
        >
          Enviar
        </button>
      </footer>
    </CrmWhatsappActionDialogShell>
  );
}
