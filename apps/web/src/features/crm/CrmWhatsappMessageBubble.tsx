import { CheckCheck } from "lucide-react";
import {
  MessageActions,
  type MessageActionHandlers,
} from "./CrmWhatsappMessageActions";
import { MessageContent, QuotedMessage } from "./CrmWhatsappMessageContent";
import { formatMessageTime, getSenderLabel } from "./crmWhatsappModel";
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
  return (
    <article
      className={
        outgoing
          ? "crm-whatsapp-bubble crm-whatsapp-bubble-out"
          : "crm-whatsapp-bubble"
      }
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
      {senderLabel ? <strong>{senderLabel}</strong> : null}
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
        {outgoing ? <CheckCheck aria-hidden="true" className="size-3" /> : null}
      </footer>
    </article>
  );
}
