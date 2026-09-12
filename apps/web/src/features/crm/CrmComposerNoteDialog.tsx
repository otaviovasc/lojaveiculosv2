import { StickyNote } from "lucide-react";
import { useMemo, useState } from "react";
import { ActionDialog } from "./CrmActionDialogFrame";
import { FeatureTextarea } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { createRuntimeProductCrmApi } from "./runtimeApi";

export function CrmComposerNoteDialog({
  disabled,
  leadId,
  onClose,
}: {
  disabled?: boolean;
  leadId: string;
  onClose: () => void;
}) {
  const productApi = useMemo(() => createRuntimeProductCrmApi(), []);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSave = Boolean(content.trim()) && !isSaving && !disabled;

  return (
    <ActionDialog
      description="Registro interno no histórico do lead. Não é enviado ao cliente."
      disabled={!canSave}
      icon={<StickyNote />}
      onClose={onClose}
      onSubmit={async () => {
        if (!canSave) return;
        setIsSaving(true);
        setError(null);
        try {
          await productApi.createActivity(leadId, {
            activityType: "note",
            content: content.trim(),
            direction: "internal",
          });
          onClose();
        } catch (caught) {
          setError(
            formatApiErrorDisplay(caught, "Não foi possível registrar a nota."),
          );
        } finally {
          setIsSaving(false);
        }
      }}
      submitLabel={isSaving ? "Salvando..." : "Salvar nota"}
      title="Nota interna"
    >
      <FeatureField label="Conteúdo da nota">
        <FeatureTextarea
          aria-label="Conteúdo da nota interna"
          disabled={isSaving}
          maxLength={2000}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Ex.: Cliente prefere contato no período da tarde..."
          value={content}
        />
      </FeatureField>
      {error ? <p className="crm-action-error">{error}</p> : null}
    </ActionDialog>
  );
}
