import {
  AlertCircle,
  Check,
  CheckCheck,
  CircleHelp,
  Clock3,
} from "lucide-react";
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
import { readReaction } from "./crmMessageHelpers";
import type { CrmMessage } from "./crmConversationTypes";

export function MessageBubble({
  actionsDisabled,
  fallbackAssigneeName,
  message,
  onDelete,
  onMediaClick,
  onQuoteClick,
  onReact,
  onRemoveReaction,
  onReply,
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
        {outgoing ? <MessageDeliveryStatus delivery={delivery} /> : null}
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
}: {
  delivery: MessageDeliveryPresentation;
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
    return (
      <span className="crm-delivery-pending" role="status" title="Enviando...">
        <Clock3 className="size-3 animate-spin" aria-hidden="true" />
        <span>Envio pendente</span>
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
