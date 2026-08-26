import {
  Check,
  ChevronDown,
  Copy,
  Reply,
  Share2,
  SmilePlus,
  Star,
  Trash2,
} from "lucide-react";
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
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const reactionButtonRef = useRef<HTMLButtonElement>(null);
  const actionInFlightRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasActions = Boolean(onReply || onReact || onDelete || message.content);
  if (!hasActions) return null;

  const handleCopy = () => {
    if (message.content) {
      void navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      setMenuOpen(false);
    }
  };

  return (
    <div className="crm-message-actions">
      {onReact ? (
        <span className="crm-reaction-anchor">
          <button
            aria-label="Reagir a mensagem"
            aria-expanded={reactionOpen}
            aria-haspopup="menu"
            disabled={actionsDisabled || Boolean(message.deletedAt)}
            onClick={() => {
              setDeleteOpen(false);
              setMenuOpen(false);
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

      {onReply ? (
        <button
          aria-label="Responder mensagem"
          className="crm-msg-reply-btn"
          disabled={actionsDisabled || Boolean(message.deletedAt)}
          onClick={() => onReply(message)}
          title="Responder"
          type="button"
        >
          <Reply className="size-3.5" />
        </button>
      ) : null}

      {onDelete ? (
        <button
          aria-label="Apagar mensagem"
          className="crm-msg-delete-btn"
          disabled={actionsDisabled || Boolean(message.deletedAt)}
          onClick={() => {
            setMenuOpen(false);
            setReactionOpen(false);
            setDeleteOpen(true);
          }}
          ref={deleteButtonRef}
          title="Apagar mensagem"
          type="button"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}

      {/* Chevron dropdown arrow interaction menu */}
      <span className="crm-msg-menu-anchor">
        <button
          aria-label="Mais opções da mensagem"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="crm-msg-menu-btn"
          disabled={actionsDisabled || Boolean(message.deletedAt)}
          onClick={() => {
            setReactionOpen(false);
            setDeleteOpen(false);
            setMenuOpen((open) => !open);
          }}
          ref={menuButtonRef}
          title="Opções"
          type="button"
        >
          <ChevronDown className="size-3.5" />
        </button>

        <FeatureAnchoredPopover
          align="end"
          anchorRef={menuButtonRef}
          ariaLabel="Opções da mensagem"
          className="crm-context-popover"
          initialFocus="first"
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          role="menu"
        >
          <div className="crm-context-menu" role="none">
            {onReply ? (
              <button
                className="crm-context-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onReply(message);
                }}
                role="menuitem"
                type="button"
              >
                <Reply className="size-4 text-muted shrink-0" />
                <span>Responder</span>
              </button>
            ) : null}

            {onReact ? (
              <button
                className="crm-context-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  setReactionOpen(true);
                }}
                role="menuitem"
                type="button"
              >
                <SmilePlus className="size-4 text-muted shrink-0" />
                <span>Reagir</span>
              </button>
            ) : null}

            {message.content ? (
              <button
                className="crm-context-menu-item"
                onClick={handleCopy}
                role="menuitem"
                type="button"
              >
                {copied ? (
                  <Check className="size-4 text-emerald-500 shrink-0" />
                ) : (
                  <Copy className="size-4 text-muted shrink-0" />
                )}
                <span>{copied ? "Copiado!" : "Copiar texto"}</span>
              </button>
            ) : null}

            <button
              className="crm-context-menu-item"
              onClick={() => {
                setMenuOpen(false);
                if (message.content) {
                  void navigator.clipboard.writeText(message.content);
                }
              }}
              role="menuitem"
              type="button"
            >
              <Share2 className="size-4 text-muted shrink-0" />
              <span>Encaminhar</span>
            </button>

            <button
              className="crm-context-menu-item"
              onClick={() => setMenuOpen(false)}
              role="menuitem"
              type="button"
            >
              <Star className="size-4 text-muted shrink-0" />
              <span>Favoritar</span>
            </button>

            {onDelete ? (
              <>
                <div className="crm-context-menu-divider" role="separator" />
                <button
                  className="crm-context-menu-item crm-context-menu-item-danger"
                  onClick={() => {
                    setMenuOpen(false);
                    setDeleteOpen(true);
                  }}
                  role="menuitem"
                  type="button"
                >
                  <Trash2 className="size-4 text-red-500 shrink-0" />
                  <span>Apagar mensagem</span>
                </button>
              </>
            ) : null}
          </div>
        </FeatureAnchoredPopover>
      </span>

      {onDelete ? (
        <span className="crm-delete-anchor">
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
              onConfirm={() => {
                void (async () => {
                  const accepted = await runMessageAction(
                    actionInFlightRef,
                    () => onDelete(message),
                  );
                  if (accepted) setDeleteOpen(false);
                })();
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
    <div className="crm-reaction-row" role="none">
      {COMMON_REACTIONS.map((emoji) => {
        const isCurrent = currentReaction === emoji;
        return (
          <button
            aria-checked={isCurrent}
            aria-label={`Reagir com ${emoji}`}
            className={
              isCurrent ? "crm-reaction-btn active" : "crm-reaction-btn"
            }
            disabled={disabled}
            key={emoji}
            onClick={() => {
              if (isCurrent && onRemove) {
                void onRemove(message);
              } else {
                void onPick(emoji);
              }
            }}
            role="menuitemradio"
            type="button"
          >
            {emoji}
          </button>
        );
      })}
      {currentReaction && onRemove ? (
        <button
          aria-label="Remover reacao"
          className="crm-reaction-btn"
          disabled={disabled}
          onClick={() => void onRemove(message)}
          role="menuitem"
          type="button"
        >
          <Trash2 aria-hidden="true" className="size-3.5" />
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
  onConfirm: () => void;
}) {
  return (
    <div className="crm-delete-prompt">
      <p>Apagar esta mensagem?</p>
      <div className="crm-delete-prompt-actions">
        <button
          className="crm-action crm-action-secondary"
          disabled={disabled}
          onClick={onCancel}
          type="button"
        >
          Cancelar
        </button>
        <button
          className="crm-action crm-action-danger"
          disabled={disabled}
          onClick={onConfirm}
          type="button"
        >
          Apagar
        </button>
      </div>
    </div>
  );
}

function handleHorizontalMenuNavigation(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  const target = event.target as HTMLElement | null;
  const container = target?.closest('[role="menu"]');
  if (!container) return;
  const items = Array.from(
    container.querySelectorAll<HTMLElement>(
      '[role="menuitem"], [role="menuitemradio"]',
    ),
  );
  if (!items.length) return;
  const currentIndex = target ? items.indexOf(target) : -1;
  const delta = event.key === "ArrowRight" ? 1 : -1;
  const nextIndex =
    currentIndex === -1
      ? 0
      : (currentIndex + delta + items.length) % items.length;
  items[nextIndex]?.focus();
  event.preventDefault();
}
