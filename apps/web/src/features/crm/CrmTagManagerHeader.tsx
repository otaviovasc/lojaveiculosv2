import { Plus, Tag, Tags, X } from "lucide-react";

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
    <header className="crm-tag-hero-card">
      <span aria-hidden="true" className="crm-tag-hero-watermark">
        <Tags />
      </span>
      <div className="crm-tag-hero-content">
        <div className="crm-tag-hero-main">
          <span className="crm-tag-hero-eyebrow">
            Organização & Classificação
          </span>
          <h2>Etiquetas</h2>
          <p>
            Defina e ordene as etiquetas para priorizar leads, categorizar
            conversas e guiar a equipe.
          </p>
        </div>
        <div className="crm-tag-hero-actions">
          <span className="crm-tag-count-badge">
            <Tag aria-hidden="true" className="size-3.5 text-emerald-600" />
            <span>
              {tagCount} {tagCount === 1 ? "ativa" : "ativas"}
            </span>
          </span>
          <button
            className="crm-action crm-tag-create-btn"
            disabled={disabled}
            onClick={onCreate}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            <span>Nova etiqueta</span>
          </button>
          {!embedded ? (
            <button
              aria-label="Fechar etiquetas"
              className="crm-icon-action"
              onClick={onClose}
              title="Fechar etiquetas"
              type="button"
            >
              <X aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
