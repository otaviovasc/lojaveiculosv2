import {
  CheckCheck,
  CheckSquare,
  ListChecks,
  Loader2,
  MailCheck,
  MailOpen,
  Tags,
  UserRound,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { CrmSelect } from "./CrmFormControls";
import {
  selectedCountLabel,
  type CrmWhatsappBulkActionDraft,
} from "./crmWhatsappQueueState";
import type {
  CrmWhatsappAssignableMember,
  CrmWhatsappTag,
} from "./crmWhatsappTypes";

const unchangedValue = "__unchanged__";
const unassignedValue = "__unassigned__";

export function WhatsappBulkBar({
  assignableMembers,
  availableTags,
  canAssign,
  canClose,
  canRead,
  canTag,
  onApply,
  onClear,
  onSelectAll,
  selectedCount,
  visible,
}: {
  assignableMembers: CrmWhatsappAssignableMember[];
  availableTags: CrmWhatsappTag[];
  canAssign: boolean;
  canClose: boolean;
  canRead: boolean;
  canTag: boolean;
  onApply: (draft: CrmWhatsappBulkActionDraft) => Promise<boolean>;
  onClear: () => void;
  onSelectAll: () => void;
  selectedCount: number;
  visible?: boolean;
}) {
  const [assignedUserId, setAssignedUserId] = useState(unchangedValue);
  const [close, setClose] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [readState, setReadState] = useState<"read" | "unread" | null>(null);
  const [tagId, setTagId] = useState(unchangedValue);
  if (!visible && selectedCount === 0) return null;

  const hasSelection = selectedCount > 0;
  const selectedTag = availableTags.find((tag) => tag.id === tagId);
  const hasAction =
    assignedUserId !== unchangedValue ||
    Boolean(selectedTag) ||
    Boolean(readState) ||
    close;
  const resetDraft = () => {
    setAssignedUserId(unchangedValue);
    setClose(false);
    setReadState(null);
    setTagId(unchangedValue);
  };
  const applyDraft = async () => {
    const draft: CrmWhatsappBulkActionDraft = {
      ...(assignedUserId !== unchangedValue
        ? {
            assignedUserId:
              assignedUserId === unassignedValue ? null : assignedUserId,
          }
        : {}),
      ...(close ? { close: true } : {}),
      ...(readState ? { readState } : {}),
      ...(selectedTag
        ? {
            tag: {
              ...(selectedTag.color ? { color: selectedTag.color } : {}),
              ...(selectedTag.emoji !== undefined
                ? { emoji: selectedTag.emoji }
                : {}),
              name: selectedTag.name,
            },
          }
        : {}),
    };
    setIsApplying(true);
    try {
      if (await onApply(draft)) resetDraft();
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <section className="crm-whatsapp-bulk-bar" aria-label="Ações em massa">
      <div className="crm-whatsapp-bulk-heading">
        <button
          className="crm-whatsapp-bulk-select-page"
          onClick={onSelectAll}
          type="button"
        >
          <CheckSquare aria-hidden="true" />
          Selecionar página
        </button>
        <strong>
          {hasSelection
            ? selectedCountLabel(selectedCount)
            : "Selecione conversas"}
        </strong>
        <button
          className="crm-whatsapp-bulk-clear"
          disabled={!hasSelection && !hasAction}
          onClick={() => {
            onClear();
            resetDraft();
          }}
          type="button"
        >
          Limpar ações
          <X aria-hidden="true" />
        </button>
      </div>

      <div className="crm-whatsapp-bulk-fields">
        {canTag && availableTags.length ? (
          <label>
            <span>
              <Tags aria-hidden="true" /> Etiqueta
            </span>
            <CrmSelect
              ariaLabel="Adicionar etiqueta às conversas selecionadas"
              disabled={!hasSelection || isApplying}
              onChange={setTagId}
              options={[
                { label: "Não adicionar etiqueta", value: unchangedValue },
                ...availableTags.map((tag) => ({
                  label: `${tag.emoji ? `${tag.emoji} ` : ""}${tag.name}`,
                  value: tag.id,
                })),
              ]}
              value={tagId}
            />
          </label>
        ) : null}
        {canAssign ? (
          <label>
            <span>
              <UserRound aria-hidden="true" /> Atendente
            </span>
            <CrmSelect
              ariaLabel="Alterar atendente das conversas selecionadas"
              disabled={!hasSelection || isApplying}
              onChange={setAssignedUserId}
              options={[
                { label: "Não alterar atendente", value: unchangedValue },
                { label: "Sem atendente", value: unassignedValue },
                ...assignableMembers
                  .filter((member) => member.isActive)
                  .map((member) => ({
                    label: member.name,
                    value: String(member.id),
                  })),
              ]}
              value={assignedUserId}
            />
          </label>
        ) : null}
      </div>

      <div className="crm-whatsapp-bulk-actions">
        <span>
          <ListChecks aria-hidden="true" /> Ações
        </span>
        <div>
          {canRead ? (
            <>
              <BulkToggle
                active={readState === "unread"}
                disabled={!hasSelection || isApplying}
                icon={<MailOpen />}
                label="Não lidas"
                onClick={() =>
                  setReadState((current) =>
                    current === "unread" ? null : "unread",
                  )
                }
              />
              <BulkToggle
                active={readState === "read"}
                disabled={!hasSelection || isApplying}
                icon={<MailCheck />}
                label="Lidas"
                onClick={() =>
                  setReadState((current) =>
                    current === "read" ? null : "read",
                  )
                }
              />
            </>
          ) : null}
          {canClose ? (
            <BulkToggle
              active={close}
              disabled={!hasSelection || isApplying}
              icon={<CheckCheck />}
              label="Concluir"
              onClick={() => setClose((current) => !current)}
            />
          ) : null}
        </div>
      </div>

      <footer>
        <p>
          {hasAction
            ? "Revise as ações antes de confirmar."
            : "Escolha uma ou mais ações para confirmar."}
        </p>
        <button
          className="crm-whatsapp-bulk-confirm"
          disabled={!hasSelection || !hasAction || isApplying}
          onClick={() => void applyDraft()}
          type="button"
        >
          {isApplying ? <Loader2 className="crm-spin" /> : <ListChecks />}
          Confirmar em {selectedCount} conversa{selectedCount === 1 ? "" : "s"}
        </button>
      </footer>
    </section>
  );
}

function BulkToggle({
  active,
  disabled,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}
