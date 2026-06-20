import { Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  DocumentKind,
  DocumentTemplate,
  UpdateDocumentTemplateInput,
} from "./types";

export function DocumentTemplatesPanel({
  isSaving,
  onSave,
  templates,
}: {
  isSaving: boolean;
  onSave: (
    kind: DocumentKind,
    input: UpdateDocumentTemplateInput,
  ) => Promise<void>;
  templates: readonly DocumentTemplate[];
}) {
  const [selectedKind, setSelectedKind] = useState(templates[0]?.kind ?? null);
  const selected = templates.find((template) => template.kind === selectedKind);
  const [draft, setDraft] = useState(() => createDraft(selected));

  useEffect(() => {
    if (!selectedKind && templates[0]) setSelectedKind(templates[0].kind);
  }, [selectedKind, templates]);

  useEffect(() => setDraft(createDraft(selected)), [selected]);

  const previewLines = useMemo(
    () => draft.clauses.map(applySampleVariables),
    [draft.clauses],
  );
  const canSave =
    draft.title.trim().length > 0 &&
    draft.clauses.every((clause) => clause.trim().length > 0);

  if (!selected) {
    return (
      <section className="documents-empty">Nenhum modelo disponivel.</section>
    );
  }

  return (
    <section className="documents-template-layout">
      <aside className="documents-template-list">
        {templates.map((template) => (
          <button
            className={
              template.kind === selected.kind
                ? "documents-template-item is-active"
                : "documents-template-item"
            }
            key={template.kind}
            onClick={() => setSelectedKind(template.kind)}
            type="button"
          >
            <strong>{template.title}</strong>
            <span>{template.isCustomized ? "Personalizado" : "Padrao"}</span>
          </button>
        ))}
      </aside>

      <section className="documents-template-editor">
        <label className="documents-template-field">
          <span>Titulo do documento</span>
          <input
            onChange={(event) =>
              setDraft({ ...draft, title: event.target.value })
            }
            value={draft.title}
          />
        </label>

        <div className="documents-template-field">
          <div className="documents-template-field-title">
            <span>Clausulas</span>
            <button
              aria-label="Adicionar clausula"
              onClick={() =>
                setDraft({ ...draft, clauses: [...draft.clauses, ""] })
              }
              title="Adicionar clausula"
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
            </button>
          </div>
          {draft.clauses.map((clause, index) => (
            <div className="documents-template-clause" key={index}>
              <textarea
                aria-label={`Clausula ${index + 1}`}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    clauses: draft.clauses.map((item, itemIndex) =>
                      itemIndex === index ? event.target.value : item,
                    ),
                  })
                }
                value={clause}
              />
              <button
                aria-label={`Remover clausula ${index + 1}`}
                disabled={draft.clauses.length === 1}
                onClick={() =>
                  setDraft({
                    ...draft,
                    clauses: draft.clauses.filter(
                      (_item, itemIndex) => itemIndex !== index,
                    ),
                  })
                }
                title="Remover clausula"
                type="button"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="documents-template-vars">
          {selected.availableVariables.map((variable) => (
            <code key={variable}>{variable}</code>
          ))}
        </div>

        <div className="documents-template-preview">
          <strong>{draft.title}</strong>
          {previewLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <div className="documents-template-actions">
          <button
            onClick={() =>
              setDraft({
                clauses: [...selected.defaultClauses],
                title: selected.defaultTitle,
              })
            }
            type="button"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Restaurar padrao
          </button>
          <button
            disabled={isSaving || !canSave}
            onClick={() => void onSave(selected.kind, draft)}
            type="button"
          >
            <Save aria-hidden="true" className="size-4" />
            {isSaving ? "Salvando" : "Salvar modelo"}
          </button>
        </div>
      </section>
    </section>
  );
}

function createDraft(template: DocumentTemplate | undefined) {
  return {
    clauses: [...(template?.clauses ?? [])],
    title: template?.title ?? "",
  };
}

function applySampleVariables(value: string) {
  return value
    .replaceAll("{{buyer.name}}", "Ana Cliente")
    .replaceAll("{{buyer.document}}", "000.000.000-00")
    .replaceAll("{{vehicle.title}}", "Fiat Toro Volcano 2023")
    .replaceAll("{{vehicle.plate}}", "ABC1D23")
    .replaceAll("{{finance.paymentMethod}}", "PIX")
    .replaceAll("{{finance.salePrice}}", "R$ 126.900")
    .replaceAll("{{finance.signalAmount}}", "R$ 5.000");
}
