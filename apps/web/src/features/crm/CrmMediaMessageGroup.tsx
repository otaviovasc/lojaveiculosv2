import { Play } from "lucide-react";
import {
  formatMessageTime,
  getSenderLabel,
  type CrmMessageView,
} from "./crmConversationModel";
import {
  readReaction,
  readRecord,
  readString,
  sanitizeCrmMessageUrl,
} from "./crmMessageHelpers";
import {
  MessageActions,
  type MessageActionHandlers,
} from "./CrmMessageActions";
import {
  MessageDeliveryStatus,
  MessageRecoveryActions,
  readDeliveryPresentation,
} from "./CrmMessageBubble";

export function CrmMediaMessageGroup({
  actionsDisabled,
  fallbackAssigneeName,
  messages,
  onDelete,
  onMediaClick,
  onReact,
  onReconcileMessage,
  onRemoveReaction,
  onReply,
  onRetryMessage,
}: MessageActionHandlers & {
  fallbackAssigneeName?: string | null;
  messages: CrmMessageView[];
  onMediaClick?: ((url: string) => void) | undefined;
}) {
  const first = messages[0];
  const last = messages[messages.length - 1];
  const outgoing = first?.direction === "OUTBOUND";
  const senderLabel = first
    ? getSenderLabel(first, fallbackAssigneeName)
    : null;
  const captions = messages.map(readCaption).filter(Boolean);
  const reaction = last ? readReaction(last.metadata) : undefined;
  const delivery = readMediaGroupDelivery(messages);
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
      {senderLabel ? (
        <div className="crm-message-attribution">
          <strong>{senderLabel}</strong>
        </div>
      ) : null}
      <div
        className={`crm-media-grid crm-media-grid-${Math.min(messages.length, 4)}`}
      >
        {messages.slice(0, 4).map((message, index) => {
          const mediaUrl = sanitizeCrmMessageUrl(message.mediaUrl);
          const isVideo = message.type === "VIDEO";
          const isFourthWithMore = index === 3 && messages.length > 4;
          const caption = readCaption(message);

          const handleClick = (e: React.MouseEvent) => {
            if (onMediaClick && mediaUrl) {
              e.preventDefault();
              onMediaClick(mediaUrl);
            }
          };

          const handleKeyDown = (event: React.KeyboardEvent) => {
            if (event.key !== " " || !onMediaClick || !mediaUrl) return;
            event.preventDefault();
            onMediaClick(mediaUrl);
          };

          if (!mediaUrl) {
            return (
              <div
                aria-label="Mídia indisponível"
                className="crm-media-cell crm-media-cell-unavailable"
                id={`crm-msg-${message.id}`}
                key={message.clientId ?? message.id}
              >
                Mídia indisponível
              </div>
            );
          }

          return (
            <a
              className="crm-media-cell"
              href={mediaUrl}
              id={`crm-msg-${message.id}`}
              key={message.clientId ?? message.id}
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              rel="noreferrer"
              target="_blank"
            >
              {isVideo ? (
                <div className="crm-media-cell-video">
                  <video muted preload="metadata" src={mediaUrl} />
                  <span className="crm-media-cell-play">
                    <Play className="size-4 fill-white text-white ml-0.5" />
                  </span>
                </div>
              ) : (
                <img
                  alt={caption || "Midia enviada"}
                  loading="lazy"
                  src={mediaUrl}
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
      <MessageRecoveryActions
        actionsDisabled={actionsDisabled}
        messages={messages}
        onReconcileMessage={onReconcileMessage}
        onRetryMessage={onRetryMessage}
      />
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
          {outgoing ? (
            <MessageDeliveryStatus
              delivery={delivery}
              pendingLabel={readMediaGroupPendingLabel(messages)}
            />
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}

function readMediaGroupDelivery(messages: CrmMessageView[]) {
  if (messages.some((message) => message.status === "FAILED")) {
    return readDeliveryPresentation("FAILED");
  }
  if (
    messages.some(
      (message) =>
        message.status === "INDETERMINATE" ||
        message.status === "PROVIDER_UNKNOWN",
    )
  ) {
    return readDeliveryPresentation("INDETERMINATE");
  }
  if (messages.some((message) => message.status === "PENDING")) {
    return readDeliveryPresentation("PENDING");
  }
  return readDeliveryPresentation(messages.at(-1)?.status ?? "unknown");
}

function readMediaGroupPendingLabel(messages: CrmMessageView[]) {
  const pending = messages.filter((message) => message.status === "PENDING");
  if (!pending.length) return undefined;
  const phases = pending.map((message) =>
    readString(readRecord(readRecord(message.metadata).localUpload).phase),
  );
  if (phases.includes("preparing")) return "Preparando mídia…";
  if (phases.includes("uploading")) return "Enviando mídia…";
  return undefined;
}

function readCaption(message: CrmMessageView) {
  const media = readRecord(readRecord(message.metadata).media);
  const caption = readString(media.caption) ?? message.content;
  if (!caption || caption === `[${message.type.toLowerCase()}]`) return "";
  return caption;
}
