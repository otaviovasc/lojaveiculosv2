import { Tags, X } from "lucide-react";
import { CrmActionDialogShell } from "./CrmActionDialogFrame";
import { TagMenu } from "./CrmTagMenu";
import type {
  CrmAddConversationCycleTagInput,
  CrmTag,
} from "./crmConversationTypes";

export function CrmComposerTagsDialog({
  activeTags,
  availableTags,
  disabled,
  onAddTag,
  onClose,
  onRemoveTag,
}: {
  activeTags: CrmTag[];
  availableTags: CrmTag[];
  disabled?: boolean;
  onAddTag: (input: CrmAddConversationCycleTagInput) => Promise<boolean>;
  onClose: () => void;
  onRemoveTag: (tagId: string) => Promise<boolean>;
}) {
  return (
    <CrmActionDialogShell
      onClose={onClose}
      panelClassName="crm-tags-dialog"
      title="Etiquetas da conversa"
    >
      <header>
        <span>
          <Tags />
        </span>
        <div>
          <h2>Etiquetas da conversa</h2>
          <p>Marque a conversa para organizar a fila e o funil.</p>
        </div>
        <button
          aria-label="Fechar"
          className="crm-icon-action"
          onClick={onClose}
          type="button"
        >
          <X />
        </button>
      </header>
      <div className="crm-action-fields">
        <TagMenu
          activeTags={activeTags}
          availableTags={availableTags}
          {...(disabled === undefined ? {} : { disabled })}
          onAdd={onAddTag}
          onRemove={onRemoveTag}
        />
      </div>
      <footer>
        <button
          className="crm-action crm-action-muted"
          onClick={onClose}
          type="button"
        >
          Fechar
        </button>
      </footer>
    </CrmActionDialogShell>
  );
}
