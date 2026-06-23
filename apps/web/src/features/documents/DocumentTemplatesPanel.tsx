import { Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
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
      <section className="documents-empty">Nenhum modelo disponível.</section>
    );
  }

  return (
    <section className="documents-template-layout">
      <aside className="glass-panel-branded documents-template-list !p-4 gap-2 relative overflow-hidden">
        {templates.map((template) => (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={
              template.kind === selected.kind
                ? "documents-template-item is-active cursor-pointer w-full text-left"
                : "documents-template-item cursor-pointer w-full text-left"
            }
            key={template.kind}
            onClick={() => setSelectedKind(template.kind)}
            type="button"
          >
            <strong>{template.title}</strong>
            <span>{template.isCustomized ? "Personalizado" : "Padrão"}</span>
          </motion.button>
        ))}
      </aside>

      <section className="glass-panel-branded documents-template-editor !p-6 relative overflow-hidden flex flex-col gap-6">
        <label className="documents-template-field grid gap-2">
          <span>Título do documento</span>
          <input
            className="min-h-11 rounded-lg border border-line bg-app px-3 text-sm font-bold text-app-text outline-none focus:shadow-[var(--shadow-focus)]"
            onChange={(event) =>
              setDraft({ ...draft, title: event.target.value })
            }
            value={draft.title}
          />
        </label>

        <div className="documents-template-field grid gap-2">
          <div className="documents-template-field-title flex justify-between items-center">
            <span>Cláusulas</span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Adicionar cláusula"
              className="inline-flex size-8 items-center justify-center rounded-lg border border-line bg-app-elevated text-muted hover:text-primary transition-all cursor-pointer"
              onClick={() =>
                setDraft({ ...draft, clauses: [...draft.clauses, ""] })
              }
              title="Adicionar cláusula"
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
            </motion.button>
          </div>
          {draft.clauses.map((clause, index) => (
            <div
              className="documents-template-clause flex gap-2 items-stretch"
              key={index}
            >
              <textarea
                aria-label={`Cláusula ${index + 1}`}
                className="flex-1 min-h-20 rounded-lg border border-line bg-app px-3 py-2 text-sm font-bold text-app-text outline-none focus:shadow-[var(--shadow-focus)]"
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
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`Remover cláusula ${index + 1}`}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all cursor-pointer disabled:opacity-30"
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
              </motion.button>
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

        <div className="documents-template-actions flex justify-end gap-3 mt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-app px-4 text-sm font-bold text-app-text hover:bg-app-elevated transition-all cursor-pointer"
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
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-black text-inverse cursor-pointer shadow-sm disabled:opacity-75"
            disabled={isSaving || !canSave}
            onClick={() => void onSave(selected.kind, draft)}
            type="button"
          >
            <Save aria-hidden="true" className="size-4" />
            {isSaving ? "Salvando" : "Salvar modelo"}
          </motion.button>
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
