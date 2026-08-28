import {
  AlertCircle,
  Check,
  CheckCheck,
  CircleHelp,
  Clock3,
} from "lucide-react";
import { useState } from "react";
import {
  MessageActions,
  type MessageActionHandlers,
} from "./CrmMessageActions";
import { MessageContent, QuotedMessage } from "./CrmMessageContent";
import {
  formatMessageTime,
  getSenderLabel,
  getSenderOriginLabel,
} from "./crmConversationModel";
import { readReaction, readRecord } from "./crmMessageHelpers";
import type { CrmMessage } from "./crmConversationTypes";

export function MessageBubble({
  actionsDisabled,
  fallbackAssigneeName,
  message,
  onDelete,
  onMediaClick,
  onQuoteClick,
  onReact,
  onReconcileMessage,
  onRemoveReaction,
  onReply,
  onRetryMessage,
}: MessageActionHandlers & {
  fallbackAssigneeName?: string | null;
  message: CrmMessage;
  onMediaClick?: ((url: string) => void) | undefined;
  onQuoteClick?: ((quoteId?: string) => void) | undefined;
}) {
  const outgoing = message.direction === "OUTBOUND";
  const senderLabel = getSenderLabel(message, fallbackAssigneeName);
  const senderOrigin = getSenderOriginLabel(message);
  const reaction = readReaction(message.metadata);
  const delivery = readDeliveryPresentation(message.status);
  const channel = (message.channel ?? "whatsapp").toLowerCase();
  const elementId = `crm-msg-${message.id}`;
  const showAttribution = Boolean(senderLabel || senderOrigin);

  return (
    <article
      className={outgoing ? "crm-bubble crm-bubble-out" : "crm-bubble"}
      data-channel={channel}
      data-message-id={String(message.id)}
      data-message-status={delivery.status}
      id={elementId}
    >
      <MessageActions
        actionsDisabled={actionsDisabled}
        currentReaction={reaction}
        message={message}
        onDelete={onDelete}
        onReact={onReact}
        onRemoveReaction={onRemoveReaction}
        onReply={onReply}
      />
      {showAttribution ? (
        <div className="crm-message-attribution">
          {senderLabel ? <strong>{senderLabel}</strong> : null}
          {senderOrigin && senderOrigin !== senderLabel ? (
            <span>{senderOrigin}</span>
          ) : null}
        </div>
      ) : null}
      <QuotedMessage
        metadata={message.metadata}
        onClick={onQuoteClick ? () => onQuoteClick() : undefined}
      />
      <MessageContent message={message} onMediaClick={onMediaClick} />
      <MessageRecoveryActions
        actionsDisabled={actionsDisabled}
        messages={[message]}
        onReconcileMessage={onReconcileMessage}
        onRetryMessage={onRetryMessage}
      />
      {reaction ? (
        <button
          aria-label={`Reacao ${reaction}`}
          className="crm-reaction-pill"
          disabled={actionsDisabled || !onRemoveReaction}
          onClick={() => {
            void onRemoveReaction?.(message);
          }}
          title="Remover reacao"
          type="button"
        >
          {reaction}
        </button>
      ) : null}
      <footer>
        <span>{formatMessageTime(message)}</span>
        {outgoing ? (
          <MessageDeliveryStatus
            delivery={delivery}
            pendingLabel={readPendingMessageLabel(message)}
          />
        ) : null}
      </footer>
    </article>
  );
}

export type MessageDeliveryPresentation = {
  label: string | null;
  status: string;
};

export function readDeliveryPresentation(
  status: string,
): MessageDeliveryPresentation {
  const normalized = status.trim().toLowerCase();
  if (normalized === "pending") {
    return { label: "Envio pendente", status: normalized };
  }
  if (normalized === "failed") {
    return { label: "Falha no envio", status: normalized };
  }
  if (normalized === "indeterminate") {
    return { label: "Envio não confirmado", status: normalized };
  }
  if (["sent", "delivered", "read"].includes(normalized)) {
    return { label: null, status: normalized };
  }
  return { label: "Envio não confirmado", status: "indeterminate" };
}

export function MessageDeliveryStatus({
  delivery,
  pendingLabel,
}: {
  delivery: MessageDeliveryPresentation;
  pendingLabel?: string | undefined;
}) {
  if (delivery.status === "failed") {
    return (
      <span
        className="crm-delivery-failed"
        role="status"
        title="Falha no envio"
      >
        <AlertCircle className="size-3" />
        <span>Falha no envio</span>
      </span>
    );
  }

  if (delivery.status === "pending") {
    const label = pendingLabel ?? "Envio pendente";
    return (
      <span className="crm-delivery-pending" role="status" title={label}>
        <Clock3 className="size-3 animate-spin" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }

  if (delivery.status === "read") {
    return (
      <CheckCheck
        aria-label="Mensagem lida"
        className="size-3.5 crm-delivery-read text-sky-400"
      />
    );
  }

  if (delivery.status === "delivered") {
    return (
      <CheckCheck
        aria-label="Mensagem entregue"
        className="size-3.5 text-muted opacity-75"
      />
    );
  }

  if (delivery.status === "sent") {
    return (
      <Check
        aria-label="Mensagem enviada"
        className="size-3.5 text-muted opacity-75"
      />
    );
  }

  return (
    <span
      className="crm-delivery-indeterminate"
      role="status"
      title="Envio não confirmado"
    >
      <CircleHelp className="size-3 text-muted" />
      <span>Envio não confirmado</span>
    </span>
  );
}

type RecoveryMessageAction = NonNullable<
  MessageActionHandlers["onRetryMessage"]
>;

export function MessageRecoveryActions({
  actionsDisabled,
  messages,
  onReconcileMessage,
  onRetryMessage,
}: Pick<
  MessageActionHandlers,
  "actionsDisabled" | "onReconcileMessage" | "onRetryMessage"
> & {
  messages: CrmMessage[];
}) {
  const failed = messages.filter(
    (message) =>
      message.direction === "OUTBOUND" && message.status === "FAILED",
  );
  const indeterminate = messages.filter(
    (message) =>
      message.direction === "OUTBOUND" &&
      (message.status === "INDETERMINATE" ||
        message.status === "PROVIDER_UNKNOWN"),
  );

  if (
    (!failed.length || !onRetryMessage) &&
    (!indeterminate.length || !onReconcileMessage)
  ) {
    return null;
  }

  return (
    <div aria-live="polite" className="crm-message-recovery-actions">
      {failed.length > 0 && onRetryMessage ? (
        <RecoveryActionButton
          actionsDisabled={actionsDisabled}
          action={onRetryMessage}
          idleLabel={recoveryLabel("Tentar novamente", failed.length)}
          messages={failed}
          pendingLabel="Tentando novamente…"
        />
      ) : null}
      {indeterminate.length > 0 && onReconcileMessage ? (
        <RecoveryActionButton
          actionsDisabled={actionsDisabled}
          action={onReconcileMessage}
          idleLabel={recoveryLabel("Verificar envio", indeterminate.length)}
          messages={indeterminate}
          pendingLabel="Verificando envio…"
        />
      ) : null}
    </div>
  );
}

function RecoveryActionButton({
  actionsDisabled,
  action,
  idleLabel,
  messages,
  pendingLabel,
}: {
  actionsDisabled?: boolean | undefined;
  action: RecoveryMessageAction;
  idleLabel: string;
  messages: CrmMessage[];
  pendingLabel: string;
}) {
  const [inFlight, setInFlight] = useState(false);

  return (
    <button
      aria-label={idleLabel}
      className="crm-message-recovery-action"
      disabled={actionsDisabled || inFlight}
      onClick={() => {
        if (inFlight) return;
        setInFlight(true);
        void runRecoveryAction(messages, action)
          .catch(() => undefined)
          .finally(() => setInFlight(false));
      }}
      title={idleLabel}
      type="button"
    >
      {inFlight ? pendingLabel : idleLabel}
    </button>
  );
}

async function runRecoveryAction(
  messages: CrmMessage[],
  action: RecoveryMessageAction,
) {
  for (const message of messages) {
    const accepted = await action(message);
    if (!accepted) return;
  }
}

function recoveryLabel(label: string, count: number) {
  return count > 1 ? `${label} (${count})` : label;
}

function readPendingMessageLabel(message: CrmMessage) {
  if (!isMediaMessage(message)) return undefined;
  const metadata = readRecord(message.metadata);
  const localUpload = readRecord(metadata.localUpload);
  if (localUpload.phase === "preparing") return "Preparando mídia…";
  if (localUpload.phase === "uploading") return "Enviando mídia…";
  return undefined;
}

function isMediaMessage(message: CrmMessage) {
  return ["AUDIO", "DOCUMENT", "IMAGE", "STICKER", "VIDEO"].includes(
    message.type,
  );
}
