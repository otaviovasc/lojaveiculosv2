import { useState } from "react";
import { Plus, StickyNote, Copy, Check, Clock } from "lucide-react";
import { FeatureTextarea } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { Morphicon } from "../../components/ui/Morphicon";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import { FeatureEmptyState } from "../../components/ui/FeatureStates";
import type {
  CreateProductCrmActivityInput,
  ProductCrmLead,
  ProductCrmLeadActivity,
} from "./productCrmTypes";

type Props = {
  lead: ProductCrmLead;
  activities: ProductCrmLeadActivity[];
  onCreateActivity: (
    leadId: string,
    input: CreateProductCrmActivityInput,
  ) => Promise<void>;
};

export function CrmLeadDetailsTabsNotas({
  lead,
  activities,
  onCreateActivity,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const notes = activities.filter((a) => a.activityType === "note");

  const handleCopyNote = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = async () => {
    if (!content.trim() || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await onCreateActivity(lead.id, {
        activityType: "note",
        content: content.trim(),
        direction: "internal",
      });
      setIsOpen(false);
      setContent("");
    } catch {
      setError("Não foi possível criar a nota. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-app-text select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="size-4 text-primary" />
          <span className="text-sm font-black text-app-text">
            Notas & Anotações ({notes.length})
          </span>
        </div>
        <FeatureActionButton
          icon={Plus}
          label="Adicionar nota"
          onClick={() => setIsOpen(true)}
        >
          Nova Nota
        </FeatureActionButton>
      </div>

      {notes.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {notes.map((n) => (
            <div
              key={n.id}
              className="p-4 bg-panel/20 border border-line/20 rounded-xl flex flex-col gap-2 hover:border-line/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded bg-emerald-500/15 text-emerald-500 shrink-0">
                    <StickyNote className="size-3" />
                  </span>
                  <span className="text-xs font-bold text-muted flex items-center gap-1">
                    <Clock className="size-3 text-muted/70" />
                    {new Date(n.occurredAt).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <button
                  className="p-1 rounded text-muted hover:text-app-text hover:bg-line/20 transition-colors"
                  onClick={() => handleCopyNote(n.content, n.id)}
                  title="Copiar nota"
                  type="button"
                >
                  {copiedId === n.id ? (
                    <Morphicon
                      active
                      className="text-success-strong"
                      name="check"
                      size={14}
                    />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
              </div>

              <p className="text-xs font-medium text-app-text leading-relaxed whitespace-pre-wrap pl-7">
                {n.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <FeatureEmptyState
          action={
            <FeatureActionButton
              icon={Plus}
              label="Adicionar nota"
              onClick={() => setIsOpen(true)}
              variant="primary"
            />
          }
          body="Nenhuma nota interna registrada para este lead. Registre detalhes de conversas, preferências ou restrições."
          density="compact"
          icon={StickyNote}
          title="Sem notas"
        />
      )}

      <FeatureDialog
        footer={
          <FeatureDialogActions
            confirmDisabled={!content.trim()}
            confirmLabel="Criar"
            isLoading={isSaving}
            loadingLabel="Criando"
            onCancel={() => !isSaving && setIsOpen(false)}
            onConfirm={() => void handleCreate()}
          />
        }
        isOpen={isOpen}
        onClose={() => !isSaving && setIsOpen(false)}
        title="Nova Nota"
      >
        <div className="flex flex-col gap-3">
          {error ? (
            <p className="text-xs font-bold text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <FeatureField label="Conteúdo">
            <FeatureTextarea
              disabled={isSaving}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Escreva sua observação ou detalhe do cliente..."
              value={content}
            />
          </FeatureField>
        </div>
      </FeatureDialog>
    </div>
  );
}
