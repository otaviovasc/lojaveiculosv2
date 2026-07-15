import { Check, Sparkles, X } from "lucide-react";
import type { DocumentsApi } from "./apiClient";
import {
  applyDocumentBuilderSuggestion,
  documentBuilderClauses,
  type DocumentBuilderDraft,
} from "./documentBuilderModel";
import type { DocumentTemplate, DocumentTemplateSuggestion } from "./types";
import { useState } from "react";

export function DocumentBuilderAiPanel({
  api,
  draft,
  onApply,
  selected,
}: {
  api: DocumentsApi | null;
  draft: DocumentBuilderDraft;
  onApply: (draft: DocumentBuilderDraft) => void;
  selected: DocumentTemplate;
}) {
  const [instruction, setInstruction] = useState("");
  const [suggestion, setSuggestion] =
    useState<DocumentTemplateSuggestion | null>(null);
  const [status, setStatus] = useState<"idle" | "busy" | "error" | "recording">(
    "idle",
  );

  const canSuggest =
    Boolean(api) &&
    selected.mode === "editable" &&
    instruction.trim().length >= 3;

  const suggest = async () => {
    if (!api || !canSuggest) return;
    setStatus("busy");
    setSuggestion(null);
    try {
      const next = await api.suggestTemplateEdit(selected.templateKey, {
        blocks: draft.blocks,
        clauses: documentBuilderClauses(draft.blocks),
        instruction,
        title: draft.title,
      });
      setSuggestion(next);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  const record = async (outcome: "accepted" | "rejected") => {
    if (!api || !suggestion) return;
    await api.recordTemplateSuggestionOutcome(selected.templateKey, {
      diffCount: suggestion.diff.length,
      outcome,
    });
  };

  const rejectSuggestion = async () => {
    if (!suggestion) return;
    setStatus("recording");
    try {
      await record("rejected");
      setSuggestion(null);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  const applySuggestion = async () => {
    if (!suggestion) return;
    setStatus("recording");
    try {
      await record("accepted");
      onApply(applyDocumentBuilderSuggestion(suggestion));
      setSuggestion(null);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section
      aria-label="Revisão assistida do modelo"
      className="documents-builder-ai-panel"
    >
      <header className="documents-builder-panel-heading">
        <div>
          <span>Revisão assistida</span>
          <h2>Compare antes de aplicar</h2>
        </div>
        <Sparkles aria-hidden="true" className="size-5" />
      </header>

      <label className="documents-builder-ai-prompt">
        <span>Pedido</span>
        <textarea
          disabled={!api || selected.mode !== "editable"}
          onChange={(event) => setInstruction(event.target.value)}
          placeholder="Ex.: deixe a cláusula de garantia mais clara e objetiva"
          value={instruction}
        />
      </label>
      <button
        className="documents-builder-primary-action"
        disabled={!canSuggest || status === "busy" || status === "recording"}
        onClick={() => void suggest()}
        type="button"
      >
        <Sparkles aria-hidden="true" className="size-4" />
        {status === "busy" ? "Gerando" : "Sugerir alteração"}
      </button>
      {status === "error" ? (
        <p className="documents-builder-error">
          Não foi possível concluir a ação agora.
        </p>
      ) : null}

      {suggestion ? (
        <section className="documents-builder-diff">
          <header>
            <strong>{suggestion.summary}</strong>
            <small>{suggestion.diff.length} mudanças propostas</small>
          </header>
          <div className="documents-builder-diff-list">
            {suggestion.diff.map((item, index) => (
              <article key={`${item.label}-${index}`}>
                <span>{item.label}</span>
                <p className="documents-builder-diff-before">{item.before}</p>
                <p className="documents-builder-diff-after">{item.after}</p>
              </article>
            ))}
          </div>
          <footer>
            <button
              disabled={status === "recording"}
              onClick={() => void rejectSuggestion()}
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
              {status === "recording" ? "Registrando" : "Recusar"}
            </button>
            <button
              disabled={status === "recording"}
              onClick={() => void applySuggestion()}
              type="button"
            >
              <Check aria-hidden="true" className="size-4" />
              {status === "recording" ? "Aplicando" : "Aplicar"}
            </button>
          </footer>
        </section>
      ) : null}
    </section>
  );
}
