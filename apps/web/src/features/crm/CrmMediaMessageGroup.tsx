import {
  formatMessageTime,
  getSenderLabel,
  type CrmMessageView,
} from "./crmConversationModel";
import { readReaction, readRecord, readString } from "./crmMessageHelpers";
import {
  MessageActions,
  type MessageActionHandlers,
} from "./CrmMessageActions";
import {
  MessageDeliveryStatus,
  readDeliveryPresentation,
} from "./CrmMessageBubble";

export function CrmMediaMessageGroup({
  actionsDisabled,
  messages,
  onDelete,
  onReact,
  onRemoveReaction,
  onReply,
}: MessageActionHandlers & {
  messages: CrmMessageView[];
}) {
  const first = messages[0];
  const last = messages[messages.length - 1];
  const outgoing = first?.direction === "OUTBOUND";
  const senderLabel = first ? getSenderLabel(first) : null;
  const captions = messages.map(readCaption).filter(Boolean);
  const reaction = last ? readReaction(last.metadata) : undefined;
  const delivery = readDeliveryPresentation(last?.status ?? "unknown");
  return (
    <article
      className={
        outgoing
          ? "crm-bubble crm-bubble-out crm-media-bundle"
          : "crm-bubble crm-media-bundle"
      }
      data-message-status={delivery.status}
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
        className={`crm-media-grid crm-media-grid-${Math.min(messages.length, 4)}`}
      >
        {messages.slice(0, 4).map((message, index) => (
          <a
            className="crm-media-cell"
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
        <p className="crm-media-bundle-caption">{captions.join("\n")}</p>
      ) : null}
      {reaction && last ? (
        <button
          aria-label={`Reacao ${reaction}`}
          className="crm-reaction-pill"
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
          {outgoing ? <MessageDeliveryStatus delivery={delivery} /> : null}
        </footer>
      ) : null}
    </article>
  );
}

function readCaption(message: CrmMessageView) {
  const media = readRecord(readRecord(message.metadata).media);
  const caption = readString(media.caption) ?? message.content;
  if (!caption || caption === `[${message.type.toLowerCase()}]`) return "";
  return caption;
}
