import { Reply, SmilePlus, Trash2, X } from "lucide-react";
import {
  useRef,
  useState,
  type KeyboardEvent,
  type MutableRefObject,
} from "react";
import { AnimatedIconSwap } from "../../components/ui/AnimatedIconSwap";
import { FeatureAnchoredPopover } from "../../components/ui/FeaturePopover";
import type { CrmMessage } from "./crmConversationTypes";

export type MessageActionHandlers = {
  actionsDisabled?: boolean | undefined;
  onDelete?: ((message: CrmMessage) => Promise<boolean>) | undefined;
  onReact?:
    ((message: CrmMessage, reaction: string) => Promise<boolean>) | undefined;
  onRemoveReaction?: ((message: CrmMessage) => Promise<boolean>) | undefined;
  onReply?: ((message: CrmMessage) => void) | undefined;
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
  message: CrmMessage;
}) {
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const reactionButtonRef = useRef<HTMLButtonElement>(null);
  const actionInFlightRef = useRef(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);
  const hasActions = Boolean(onReply || onReact || onDelete);
  if (!hasActions) return null;

  return (
    <div className="crm-message-actions">
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
        <span className="crm-reaction-anchor">
          <button
            aria-label="Reagir a mensagem"
            aria-expanded={reactionOpen}
            aria-haspopup="menu"
            disabled={actionsDisabled || Boolean(message.deletedAt)}
            onClick={() => {
              setDeleteOpen(false);
              setReactionOpen((open) => !open);
            }}
            ref={reactionButtonRef}
            title="Reagir"
            type="button"
          >
            <AnimatedIconSwap stateKey={reactionOpen} variant="pop">
              <SmilePlus />
            </AnimatedIconSwap>
          </button>
          <FeatureAnchoredPopover
            align="end"
            anchorRef={reactionButtonRef}
            ariaLabel="Reações da mensagem"
            className="crm-reaction-palette"
            initialFocus="first"
            isOpen={reactionOpen}
            maxHeight={96}
            onClose={() => setReactionOpen(false)}
            onKeyDown={handleHorizontalMenuNavigation}
            role="menu"
          >
            <ReactionPalette
              currentReaction={currentReaction}
              disabled={Boolean(actionsDisabled)}
              message={message}
              onPick={async (value) => {
                const accepted = await runMessageAction(actionInFlightRef, () =>
                  onReact(message, value),
                );
                if (accepted) setReactionOpen(false);
                return accepted;
              }}
              onRemove={
                onRemoveReaction
                  ? async (targetMessage) => {
                      const accepted = await runMessageAction(
                        actionInFlightRef,
                        () => onRemoveReaction(targetMessage),
                      );
                      if (accepted) setReactionOpen(false);
                      return accepted;
                    }
                  : undefined
              }
            />
          </FeatureAnchoredPopover>
        </span>
      ) : null}
      {onDelete ? (
        <span className="crm-delete-anchor">
          <button
            aria-label="Apagar mensagem"
            aria-expanded={deleteOpen}
            aria-haspopup="dialog"
            disabled={actionsDisabled || Boolean(message.deletedAt)}
            onClick={() => {
              setReactionOpen(false);
              setDeleteOpen((open) => !open);
            }}
            ref={deleteButtonRef}
            title="Apagar"
            type="button"
          >
            <AnimatedIconSwap stateKey={deleteOpen} variant="pop">
              <Trash2 />
            </AnimatedIconSwap>
          </button>
          <FeatureAnchoredPopover
            align="end"
            anchorRef={deleteButtonRef}
            ariaLabel="Confirmar exclusão da mensagem"
            className="crm-delete-confirm"
            initialFocus="first"
            isOpen={deleteOpen}
            maxHeight={112}
            onClose={() => setDeleteOpen(false)}
            role="dialog"
          >
            <DeleteMessageConfirm
              disabled={Boolean(actionsDisabled)}
              onCancel={() => setDeleteOpen(false)}
              onConfirm={async () => {
                const accepted = await runMessageAction(actionInFlightRef, () =>
                  onDelete(message),
                );
                if (accepted) setDeleteOpen(false);
                return accepted;
              }}
            />
          </FeatureAnchoredPopover>
        </span>
      ) : null}
    </div>
  );
}

async function runMessageAction(
  inFlightRef: MutableRefObject<boolean>,
  action: () => Promise<boolean>,
) {
  if (inFlightRef.current) return false;
  inFlightRef.current = true;
  try {
    return await action();
  } finally {
    inFlightRef.current = false;
  }
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
  message: CrmMessage;
  onPick: (reaction: string) => Promise<boolean>;
  onRemove?: ((message: CrmMessage) => Promise<boolean>) | undefined;
}) {
  return (
    <div className="crm-reaction-palette-items">
      {COMMON_REACTIONS.map((reaction) => (
        <button
          aria-checked={currentReaction === reaction}
          aria-label={`Reagir com ${reaction}`}
          disabled={disabled}
          key={reaction}
          onClick={() => {
            void onPick(reaction);
          }}
          role="menuitemradio"
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
          role="menuitem"
          type="button"
        >
          <X />
        </button>
      ) : null}
    </div>
  );
}

function handleHorizontalMenuNavigation(event: KeyboardEvent<HTMLDivElement>) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
    return;
  }
  const items = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      '[role^="menuitem"]:not(:disabled)',
    ),
  );
  if (!items.length) return;
  event.preventDefault();
  const currentIndex = items.indexOf(document.activeElement as HTMLElement);
  const nextIndex =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowRight"
          ? (currentIndex + 1) % items.length
          : (currentIndex - 1 + items.length) % items.length;
  items[nextIndex]?.focus();
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
    <div className="crm-delete-confirm-content">
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
