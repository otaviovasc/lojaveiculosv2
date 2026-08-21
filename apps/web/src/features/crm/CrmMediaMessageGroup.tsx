import { Play } from "lucide-react";
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
  onMediaClick,
  onReact,
  onRemoveReaction,
  onReply,
}: MessageActionHandlers & {
  messages: CrmMessageView[];
  onMediaClick?: ((url: string) => void) | undefined;
}) {
  const first = messages[0];
  const last = messages[messages.length - 1];
  const outgoing = first?.direction === "OUTBOUND";
  const senderLabel = first ? getSenderLabel(first) : null;
  const captions = messages.map(readCaption).filter(Boolean);
  const reaction = last ? readReaction(last.metadata) : undefined;
  const delivery = readDeliveryPresentation(last?.status ?? "unknown");
  const channel = (first?.channel ?? "whatsapp").toLowerCase();

  return (
    <article
      className={
        outgoing
          ? "crm-bubble crm-bubble-out crm-media-bundle"
          : "crm-bubble crm-media-bundle"
      }
      data-channel={channel}
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
        {messages.slice(0, 4).map((message, index) => {
          const isVideo = message.type === "VIDEO";
          const isFourthWithMore = index === 3 && messages.length > 4;
          const caption = readCaption(message);

          const handleClick = (e: React.MouseEvent) => {
            if (onMediaClick && message.mediaUrl) {
              e.preventDefault();
              onMediaClick(message.mediaUrl);
            }
          };

          return (
            <a
              className="crm-media-cell"
              href={message.mediaUrl ?? undefined}
              key={message.clientId ?? message.id}
              onClick={handleClick}
              rel="noreferrer"
              target="_blank"
            >
              {isVideo ? (
                <div className="crm-media-cell-video">
                  <video
                    muted
                    preload="metadata"
                    src={message.mediaUrl ?? undefined}
                  />
                  <span className="crm-media-cell-play">
                    <Play className="size-4 fill-white text-white ml-0.5" />
                  </span>
                </div>
              ) : (
                <img
                  alt={caption || "Midia enviada"}
                  loading="lazy"
                  src={message.mediaUrl ?? undefined}
                />
              )}
              {isFourthWithMore ? (
                <span className="crm-media-cell-more">
                  +{messages.length - 4}
                </span>
              ) : null}
            </a>
          );
        })}
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
