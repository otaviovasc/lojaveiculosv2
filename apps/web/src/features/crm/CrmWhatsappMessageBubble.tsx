import { AlertTriangle, CheckCheck, CircleHelp, Clock3 } from "lucide-react";
import {
  MessageActions,
  type MessageActionHandlers,
} from "./CrmWhatsappMessageActions";
import { MessageContent, QuotedMessage } from "./CrmWhatsappMessageContent";
import {
  formatMessageTime,
  getSenderLabel,
  getSenderOriginLabel,
} from "./crmWhatsappModel";
import { readReaction } from "./crmWhatsappMessageHelpers";
import type { CrmWhatsappMessage } from "./crmWhatsappTypes";

export function MessageBubble({
  actionsDisabled,
  message,
  onDelete,
  onReact,
  onRemoveReaction,
  onReply,
}: MessageActionHandlers & {
  message: CrmWhatsappMessage;
}) {
  const outgoing = message.direction === "OUTBOUND";
  const senderLabel = getSenderLabel(message);
  const reaction = readReaction(message.metadata);
  const delivery = readDeliveryPresentation(message.status);
  return (
    <article
      className={
        outgoing
          ? "crm-whatsapp-bubble crm-whatsapp-bubble-out"
          : "crm-whatsapp-bubble"
      }
      data-message-status={delivery.status}
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
      <div className="crm-whatsapp-message-attribution">
        {senderLabel ? <strong>{senderLabel}</strong> : null}
        <span>{getSenderOriginLabel(message)}</span>
      </div>
      <QuotedMessage metadata={message.metadata} />
      <MessageContent message={message} />
      {reaction ? (
        <button
          aria-label={`Reacao ${reaction}`}
          className="crm-whatsapp-reaction-pill"
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
  if (!delivery.label) {
    return <CheckCheck aria-label="Mensagem enviada" className="size-3" />;
  }
  const Icon =
    delivery.status === "pending"
      ? Clock3
      : delivery.status === "failed"
        ? AlertTriangle
        : CircleHelp;
  return (
    <span className="crm-whatsapp-message-delivery" role="status">
      <Icon aria-hidden="true" />
      {delivery.label}
    </span>
  );
}
