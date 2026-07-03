import { CheckCheck } from "lucide-react";
import {
  formatMessageTime,
  getSenderLabel,
  type WhatsappMessageView,
} from "./crmWhatsappModel";
import {
  readReaction,
  readRecord,
  readString,
} from "./crmWhatsappMessageHelpers";
import {
  MessageActions,
  type MessageActionHandlers,
} from "./CrmWhatsappMessageActions";

export function CrmWhatsappMediaMessageGroup({
  actionsDisabled,
  messages,
  onDelete,
  onReact,
  onRemoveReaction,
  onReply,
}: MessageActionHandlers & {
  messages: WhatsappMessageView[];
}) {
  const first = messages[0];
  const last = messages[messages.length - 1];
  const outgoing = first?.direction === "OUTBOUND";
  const senderLabel = first ? getSenderLabel(first) : null;
  const captions = messages.map(readCaption).filter(Boolean);
  const reaction = last ? readReaction(last.metadata) : undefined;
  return (
    <article
      className={
        outgoing
          ? "crm-whatsapp-bubble crm-whatsapp-bubble-out crm-whatsapp-media-bundle"
          : "crm-whatsapp-bubble crm-whatsapp-media-bundle"
      }
    >
      {last ? (
        <MessageActions
          actionsDisabled={actionsDisabled}
          currentReaction={reaction}
          message={last}
          onDelete={onDelete}
          onReact={onReact}
          onRemoveReaction={onRemoveReaction}
          onReply={onReply}
        />
      ) : null}
      {senderLabel ? <strong>{senderLabel}</strong> : null}
      <div
        className={`crm-whatsapp-media-grid crm-whatsapp-media-grid-${Math.min(messages.length, 4)}`}
      >
        {messages.slice(0, 4).map((message, index) => (
          <a
            className="crm-whatsapp-media-cell"
            href={message.mediaUrl ?? undefined}
            key={message.clientId ?? message.id}
            rel="noreferrer"
            target="_blank"
          >
            {message.type === "VIDEO" ? (
              <video src={message.mediaUrl ?? undefined} />
            ) : (
              <img
                alt={readCaption(message) || "Midia enviada"}
                src={message.mediaUrl ?? undefined}
              />
            )}
            {index === 3 && messages.length > 4 ? (
              <span>+{messages.length - 4}</span>
            ) : null}
          </a>
        ))}
      </div>
      {captions.length ? (
        <p className="crm-whatsapp-media-bundle-caption">
          {captions.join("\n")}
        </p>
      ) : null}
      {reaction && last ? (
        <button
          aria-label={`Reacao ${reaction}`}
          className="crm-whatsapp-reaction-pill"
          disabled={actionsDisabled || !onRemoveReaction}
          onClick={() => {
            void onRemoveReaction?.(last);
          }}
          title="Remover reacao"
          type="button"
        >
          {reaction}
        </button>
      ) : null}
      {last ? (
        <footer>
          <span>{formatMessageTime(last)}</span>
          {outgoing ? (
            <CheckCheck aria-hidden="true" className="size-3" />
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}

function readCaption(message: WhatsappMessageView) {
  const media = readRecord(readRecord(message.metadata).media);
  const caption = readString(media.caption) ?? message.content;
  if (!caption || caption === `[${message.type.toLowerCase()}]`) return "";
  return caption;
}
