import { X } from "lucide-react";
import type { ReactNode } from "react";

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
    <div className="crm-whatsapp-action-dialog" role="dialog" aria-modal="true">
      <div className="crm-whatsapp-action-panel">
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
      </div>
    </div>
  );
}
