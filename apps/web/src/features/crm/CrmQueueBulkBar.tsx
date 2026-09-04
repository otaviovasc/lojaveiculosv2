import {
  CheckSquare,
  ListChecks,
  Loader2,
  Tags,
  UserRound,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Morphicon } from "../../components/ui/Morphicon";
import { CrmSelect } from "./CrmFormControls";
import { selectedCountLabel, type CrmBulkActionDraft } from "./crmQueueState";
import type { CrmAssignableMember, CrmTag } from "./crmConversationTypes";

const unchangedValue = "__unchanged__";
const unassignedValue = "__unassigned__";

export function CrmQueueBulkBar({
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
  assignableMembers: CrmAssignableMember[];
  availableTags: CrmTag[];
  canAssign: boolean;
  canClose: boolean;
  canRead: boolean;
  canTag: boolean;
  onApply: (draft: CrmBulkActionDraft) => Promise<boolean>;
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
    const draft: CrmBulkActionDraft = {
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
    <section className="crm-bulk-bar" aria-label="Ações em massa">
      <div className="crm-bulk-heading">
        <div className="crm-bulk-heading-top">
          <div className="crm-bulk-title-wrap">
            <strong>
              {hasSelection
                ? selectedCountLabel(selectedCount)
                : "Selecione conversas"}
            </strong>
          </div>
          <button
            aria-label="Limpar ações"
            className="crm-bulk-clear"
            disabled={!hasSelection && !hasAction}
            onClick={() => {
              onClear();
              resetDraft();
            }}
            title="Limpar ações"
            type="button"
          >
            <Morphicon
              active={true}
              aria-hidden="true"
              name="check-cross"
              size={12}
            />
            <span>Limpar ações</span>
          </button>
        </div>
        <button
          className="crm-bulk-select-page"
          onClick={onSelectAll}
          type="button"
        >
          <CheckSquare aria-hidden="true" />
          <span>Selecionar página</span>
        </button>
      </div>

      <div className="crm-bulk-fields">
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

      <div className="crm-bulk-actions">
        <span>
          <ListChecks aria-hidden="true" /> Ações
        </span>
        <div>
          {canRead ? (
            <>
              <BulkToggle
                active={readState === "unread"}
                disabled={!hasSelection || isApplying}
                icon={
                  <Morphicon
                    active={readState === "unread"}
                    aria-hidden="true"
                    name="mail-read-unread"
                    size={14}
                  />
                }
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
                icon={
                  <Morphicon
                    active={false}
                    aria-hidden="true"
                    name="mail-read-unread"
                    size={14}
                  />
                }
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
              icon={
                <Morphicon
                  active={close}
                  aria-hidden="true"
                  name="check"
                  size={14}
                />
              }
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
          className="crm-bulk-confirm"
          disabled={!hasSelection || !hasAction || isApplying}
          onClick={() => void applyDraft()}
          type="button"
        >
          {isApplying ? (
            <Loader2 className="crm-spin" />
          ) : (
            <Morphicon
              active={true}
              aria-hidden="true"
              name="check"
              size={16}
            />
          )}
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
