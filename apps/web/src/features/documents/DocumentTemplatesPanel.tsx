import { Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DocumentTemplatePreview } from "./DocumentTemplatePreview";
import { kindLabel } from "./documentLabels";
import {
  renderDocumentTemplatePreview,
  variableSample,
  type DocumentTemplateDraft,
} from "./documentTemplatePreviewModel";
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

  const previewKind = selected?.kind ?? templates[0]?.kind ?? "sale_contract";
  const preview = useMemo(
    () => renderDocumentTemplatePreview(draft, previewKind),
    [draft, previewKind],
  );
  const canSave =
    draft.title.trim().length > 0 &&
    draft.clauses.every((clause) => clause.trim().length > 0);
  const isDirty =
    draft.title !== selected?.title ||
    draft.clauses.length !== selected?.clauses.length ||
    draft.clauses.some((clause, index) => clause !== selected?.clauses[index]);

  if (!selected) {
    return (
      <section className="documents-empty">Nenhum modelo disponível.</section>
    );
  }

  return (
    <section className="documents-template-layout">
      <header className="documents-template-picker-bar">
        <label className="documents-template-picker">
          <span>Modelo</span>
          <select
            onChange={(event) => {
              const nextTemplate = templates.find(
                (template) => template.kind === event.target.value,
              );
              if (nextTemplate) setSelectedKind(nextTemplate.kind);
            }}
            value={selected.kind}
          >
            {templates.map((template) => (
              <option key={template.kind} value={template.kind}>
                {template.title}
              </option>
            ))}
          </select>
        </label>
        <div className="documents-template-picker-summary">
          <span>{kindLabel(selected.kind)}</span>
          <strong>{selected.title}</strong>
          <small>
            {isDirty
              ? "Alterações não salvas"
              : selected.isCustomized
                ? "Personalizado"
                : "Padrão"}
          </small>
        </div>
      </header>

      <section className="documents-template-editor">
        <header className="documents-template-editor-header">
          <div>
            <span>{kindLabel(selected.kind)}</span>
            <strong>{draft.title || selected.title}</strong>
          </div>
          <small>{isDirty ? "Alterações não salvas" : "Sem alterações"}</small>
        </header>

        <label className="documents-template-field">
          <span>Título do documento</span>
          <input
            onChange={(event) =>
              setDraft({ ...draft, title: event.target.value })
            }
            value={draft.title}
          />
        </label>

        <div className="documents-template-field">
          <div className="documents-template-field-title">
            <span>Cláusulas</span>
            <button
              aria-label="Adicionar cláusula"
              onClick={() =>
                setDraft({ ...draft, clauses: [...draft.clauses, ""] })
              }
              title="Adicionar cláusula"
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
            </button>
          </div>
          {draft.clauses.map((clause, index) => (
            <div className="documents-template-clause" key={index}>
              <textarea
                aria-label={`Cláusula ${index + 1}`}
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
                aria-label={`Remover cláusula ${index + 1}`}
                className="documents-template-remove"
                disabled={draft.clauses.length === 1}
                onClick={() =>
                  setDraft({
                    ...draft,
                    clauses: draft.clauses.filter(
                      (_item, itemIndex) => itemIndex !== index,
                    ),
                  })
                }
                title="Remover cláusula"
                type="button"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
          ))}
        </div>

        <section className="documents-template-vars" aria-label="Variáveis">
          {selected.availableVariables.map((variable) => (
            <code key={variable}>
              <span>{variable}</span>
              <small>{variableSample(variable)}</small>
            </code>
          ))}
        </section>

        <footer className="documents-template-actions">
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
            Restaurar padrão
          </button>
          <button
            disabled={isSaving || !canSave || !isDirty}
            onClick={() => void onSave(selected.kind, draft)}
            type="button"
          >
            <Save aria-hidden="true" className="size-4" />
            {isSaving ? "Salvando" : "Salvar modelo"}
          </button>
        </footer>
      </section>

      <DocumentTemplatePreview
        isCustomized={selected.isCustomized || isDirty}
        kind={selected.kind}
        preview={preview}
      />
    </section>
  );
}

function createDraft(
  template: DocumentTemplate | undefined,
): DocumentTemplateDraft {
  return {
    clauses: [...(template?.clauses ?? [])],
    title: template?.title ?? "",
  };
}
