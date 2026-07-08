import { Tag, X } from "lucide-react";

export function TagManagerHeader({
  embedded,
  onClose,
  tagCount,
}: {
  embedded: boolean;
  onClose: () => void;
  tagCount: number;
}) {
  return (
    <header>
      <span>
        <Tag />
      </span>
      <div>
        <h2>Etiquetas</h2>
        <p>Organize origem, prioridade e proxima acao das conversas.</p>
      </div>
      <span className="crm-whatsapp-page-meta">{tagCount} ativas</span>
      {embedded ? null : (
        <button
          aria-label="Fechar"
          className="crm-icon-action"
          onClick={onClose}
          type="button"
        >
          <X />
        </button>
      )}
    </header>
  );
}
