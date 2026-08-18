import { Plus, Save } from "lucide-react";
import { FeatureDrawer } from "../../components/ui/FeatureOverlay";
import { type TagDraft, TagDraftFields } from "./CrmTagManagerParts";
import type { CrmTag } from "./crmConversationTypes";

export function TagEditorDrawer({
  canSave,
  disabled,
  draft,
  editing,
  error,
  isOpen,
  isSaving,
  onChange,
  onClose,
  onSave,
  statusMessage,
}: {
  canSave: boolean;
  disabled: boolean;
  draft: TagDraft;
  editing: CrmTag | null;
  error: string | null;
  isOpen: boolean;
  isSaving: boolean;
  onChange: (draft: TagDraft) => void;
  onClose: () => void;
  onSave: () => void;
  statusMessage: string | null;
}) {
  return (
    <FeatureDrawer
      footer={
        <div className="crm-tag-editor-actions">
          <button
            className="crm-action crm-action-muted"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="crm-action"
            disabled={!canSave}
            onClick={onSave}
            type="button"
          >
            {editing ? (
              <Save aria-hidden="true" />
            ) : (
              <Plus aria-hidden="true" />
            )}
            {editing ? "Atualizar" : "Criar etiqueta"}
          </button>
        </div>
      }
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? `Editar ${editing.name}` : "Nova etiqueta"}
    >
      <div className="crm-tag-editor-column">
        {error ? (
          <p className="crm-tag-manager-error" role="alert">
            {error}
          </p>
        ) : null}
        {statusMessage ? (
          <p aria-live="polite" className="crm-tag-manager-status">
            {statusMessage}
          </p>
        ) : null}
        <TagDraftFields
          disabled={disabled || isSaving}
          draft={draft}
          onChange={onChange}
        />
      </div>
    </FeatureDrawer>
  );
}
