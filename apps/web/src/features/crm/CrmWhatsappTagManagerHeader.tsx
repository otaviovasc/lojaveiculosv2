import { Plus, Tag, X } from "lucide-react";
import { CrmWhatsappModeBar } from "./CrmWhatsappWorkflow";

export function TagManagerHeader({
  disabled,
  embedded,
  onClose,
  onCreate,
  tagCount,
}: {
  disabled: boolean;
  embedded: boolean;
  onClose: () => void;
  onCreate: () => void;
  tagCount: number;
}) {
  return (
    <CrmWhatsappModeBar
      actions={
        <>
          {embedded ? null : (
            <button
              aria-label="Fechar etiquetas"
              className="crm-icon-action"
              onClick={onClose}
              title="Fechar etiquetas"
              type="button"
            >
              <X aria-hidden="true" />
            </button>
          )}
          <button
            className="crm-action"
            disabled={disabled}
            onClick={onCreate}
            type="button"
          >
            <Plus aria-hidden="true" />
            Nova etiqueta
          </button>
        </>
      }
      summary={`${tagCount} ${tagCount === 1 ? "ativa" : "ativas"}`}
    >
      <span className="crm-whatsapp-mode-label">
        <Tag aria-hidden="true" />
        Ordem e identificacao da fila
      </span>
    </CrmWhatsappModeBar>
  );
}
