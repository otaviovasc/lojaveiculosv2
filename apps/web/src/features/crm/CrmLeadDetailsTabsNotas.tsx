import { useState } from "react";
import { Plus, StickyNote } from "lucide-react";
import { FeatureTextarea } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
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

  const notes = activities.filter((a) => a.activityType === "note");

  const handleCreate = async () => {
    if (!content.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onCreateActivity(lead.id, {
        activityType: "note",
        content: content.trim(),
        direction: "internal",
      });
      setIsOpen(false);
      setContent("");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-app-text select-none">
      <div className="flex items-center justify-between">
        <span className="text-sm font-black text-app-text">Notas</span>
        <FeatureActionButton
          icon={Plus}
          label="Adicionar nota"
          onClick={() => setIsOpen(true)}
        >
          Nota
        </FeatureActionButton>
      </div>

      {notes.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {notes.map((n) => (
            <div
              key={n.id}
              className="p-3.5 bg-panel/10 border border-line/15 rounded-xl flex flex-col gap-1.5"
            >
              <span className="text-xs font-bold text-app-text leading-relaxed whitespace-pre-wrap">
                {n.content}
              </span>
              <span className="text-xs font-bold text-muted self-end mt-1">
                {new Date(n.occurredAt).toLocaleString("pt-BR")}
              </span>
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
          body="Nenhuma nota criada para este lead ainda."
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
        <FeatureField label="Conteúdo">
          <FeatureTextarea
            disabled={isSaving}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Escreva sua nota aqui..."
            value={content}
          />
        </FeatureField>
      </FeatureDialog>
    </div>
  );
}
