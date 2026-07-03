import { Reply, SmilePlus, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { CrmWhatsappMessage } from "./crmWhatsappTypes";

export type MessageActionHandlers = {
  actionsDisabled?: boolean | undefined;
  onDelete?: ((message: CrmWhatsappMessage) => Promise<boolean>) | undefined;
  onReact?:
    | ((message: CrmWhatsappMessage, reaction: string) => Promise<boolean>)
    | undefined;
  onRemoveReaction?:
    ((message: CrmWhatsappMessage) => Promise<boolean>) | undefined;
  onReply?: ((message: CrmWhatsappMessage) => void) | undefined;
};

export function MessageActions({
  actionsDisabled,
  currentReaction,
  message,
  onDelete,
  onReact,
  onRemoveReaction,
  onReply,
}: MessageActionHandlers & {
  currentReaction?: string | undefined;
  message: CrmWhatsappMessage;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);
  const hasActions = Boolean(onReply || onReact || onDelete);
  if (!hasActions) return null;

  return (
    <div className="crm-whatsapp-message-actions">
      {onReply ? (
        <button
          aria-label="Responder mensagem"
          disabled={actionsDisabled || Boolean(message.deletedAt)}
          onClick={() => onReply(message)}
          title="Responder"
          type="button"
        >
          <Reply />
        </button>
      ) : null}
      {onReact ? (
        <span className="crm-whatsapp-reaction-anchor">
          <button
            aria-label="Reagir a mensagem"
            disabled={actionsDisabled || Boolean(message.deletedAt)}
            onClick={() => {
              setDeleteOpen(false);
              setReactionOpen((open) => !open);
            }}
            title="Reagir"
            type="button"
          >
            <SmilePlus />
          </button>
          {reactionOpen ? (
            <ReactionPalette
              currentReaction={currentReaction}
              disabled={Boolean(actionsDisabled)}
              message={message}
              onPick={async (value) => {
                const accepted = await onReact(message, value);
                if (accepted) setReactionOpen(false);
                return accepted;
              }}
              onRemove={onRemoveReaction}
            />
          ) : null}
        </span>
      ) : null}
      {onDelete ? (
        <span className="crm-whatsapp-delete-anchor">
          <button
            aria-label="Apagar mensagem"
            disabled={actionsDisabled || Boolean(message.deletedAt)}
            onClick={() => {
              setReactionOpen(false);
              setDeleteOpen((open) => !open);
            }}
            title="Apagar"
            type="button"
          >
            <Trash2 />
          </button>
          {deleteOpen ? (
            <DeleteMessageConfirm
              disabled={Boolean(actionsDisabled)}
              onCancel={() => setDeleteOpen(false)}
              onConfirm={async () => {
                const accepted = await onDelete(message);
                if (accepted) setDeleteOpen(false);
                return accepted;
              }}
            />
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

const COMMON_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function ReactionPalette({
  currentReaction,
  disabled,
  message,
  onPick,
  onRemove,
}: {
  currentReaction?: string | undefined;
  disabled: boolean;
  message: CrmWhatsappMessage;
  onPick: (reaction: string) => Promise<boolean>;
  onRemove?: ((message: CrmWhatsappMessage) => Promise<boolean>) | undefined;
}) {
  return (
    <div className="crm-whatsapp-reaction-palette" role="menu">
      {COMMON_REACTIONS.map((reaction) => (
        <button
          aria-label={`Reagir com ${reaction}`}
          aria-pressed={currentReaction === reaction}
          disabled={disabled}
          key={reaction}
          onClick={() => {
            void onPick(reaction);
          }}
          type="button"
        >
          {reaction}
        </button>
      ))}
      {currentReaction && onRemove ? (
        <button
          aria-label="Remover reacao"
          disabled={disabled}
          onClick={() => {
            void onRemove(message);
          }}
          type="button"
        >
          <X />
        </button>
      ) : null}
    </div>
  );
}

function DeleteMessageConfirm({
  disabled,
  onCancel,
  onConfirm,
}: {
  disabled: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<boolean>;
}) {
  return (
    <div className="crm-whatsapp-delete-confirm" role="group">
      <span>Apagar?</span>
      <button
        disabled={disabled}
        onClick={() => void onConfirm()}
        type="button"
      >
        Apagar
      </button>
      <button
        aria-label="Cancelar apagar mensagem"
        disabled={disabled}
        onClick={onCancel}
        type="button"
      >
        <X />
      </button>
    </div>
  );
}
