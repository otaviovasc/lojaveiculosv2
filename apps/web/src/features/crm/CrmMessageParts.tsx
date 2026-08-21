import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CrmMediaMessageGroup } from "./CrmMediaMessageGroup";
import { MessageBubble } from "./CrmMessageBubble";
import type { MessageActionHandlers } from "./CrmMessageActions";
import { groupMessagesForDisplay } from "./crmMessageGroups";
import {
  formatCrmMessageDay,
  messageGroupTimestamp,
  shouldShowMessageDay,
} from "./crmMessageDates";
import {
  formatMessageTime,
  getSenderLabel,
  type CrmMessageView,
} from "./crmConversationModel";
import { readRecord, readString } from "./crmMessageHelpers";
import { MessageListSkeleton } from "./CrmSkeletons";
import {
  CrmMediaGalleryViewer,
  type CrmGalleryMediaItem,
} from "./CrmMediaGalleryViewer";

export function MessageList({
  actionsDisabled,
  isLoading,
  messages,
  onDelete,
  onReact,
  onRemoveReaction,
  onReply,
  onFilesDropped,
}: MessageActionHandlers & {
  isLoading: boolean;
  messages: CrmMessageView[];
  onFilesDropped?: ((files: File[]) => void) | undefined;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages]);

  // Extract all media items for the gallery viewer
  const galleryItems = useMemo<CrmGalleryMediaItem[]>(() => {
    const items: CrmGalleryMediaItem[] = [];
    for (const msg of messages) {
      if (
        msg.mediaUrl &&
        (msg.type === "IMAGE" || msg.type === "VIDEO" || msg.type === "STICKER")
      ) {
        const metadata = readRecord(msg.metadata);
        const media = readRecord(metadata.media);
        const caption = readString(media.caption) ?? msg.content;
        const cleanCaption =
          caption === `[${msg.type.toLowerCase()}]` ? undefined : caption;

        items.push({
          caption: cleanCaption,
          sender:
            getSenderLabel(msg) ||
            (msg.direction === "OUTBOUND" ? "Você" : "Contato"),
          time: formatMessageTime(msg),
          type: msg.type,
          url: msg.mediaUrl,
        });
      }
    }
    return items;
  }, [messages]);

  const handleMediaClick = useCallback(
    (url: string) => {
      const index = galleryItems.findIndex((item) => item.url === url);
      if (index !== -1) {
        setGalleryIndex(index);
        setGalleryOpen(true);
      } else {
        setGalleryIndex(0);
        setGalleryOpen(true);
      }
    },
    [galleryItems],
  );

  const handleQuoteClick = useCallback((quoteMessageId?: string) => {
    if (!quoteMessageId) return;
    const targetElement = document.getElementById(`crm-msg-${quoteMessageId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      targetElement.classList.add("crm-bubble-highlight");
      setTimeout(() => {
        targetElement.classList.remove("crm-bubble-highlight");
      }, 1500);
    }
  }, []);

  if (isLoading) {
    return <MessageListSkeleton />;
  }

  const groups = groupMessagesForDisplay(messages);
  return (
    <>
      <div
        className="crm-messages"
        onDragOver={(event) => {
          if (!onFilesDropped || !hasDraggedFiles(event.dataTransfer)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(event) => {
          if (!onFilesDropped) return;
          const files = Array.from(event.dataTransfer.files);
          if (!files.length) return;
          event.preventDefault();
          onFilesDropped(files);
        }}
      >
        {groups.map((group, index) => {
          const key =
            group.kind === "media"
              ? group.messages.map((message) => message.id).join(":")
              : (group.message.clientId ?? group.message.id);
          return (
            <Fragment key={key}>
              {shouldShowMessageDay(group, groups[index - 1]) ? (
                <time className="crm-message-day">
                  {formatCrmMessageDay(messageGroupTimestamp(group))}
                </time>
              ) : null}
              {group.kind === "media" ? (
                <CrmMediaMessageGroup
                  actionsDisabled={actionsDisabled}
                  messages={group.messages}
                  onDelete={onDelete}
                  onMediaClick={handleMediaClick}
                  onReact={onReact}
                  onRemoveReaction={onRemoveReaction}
                  onReply={onReply}
                />
              ) : (
                <MessageBubble
                  actionsDisabled={actionsDisabled}
                  message={group.message}
                  onDelete={onDelete}
                  onMediaClick={handleMediaClick}
                  onQuoteClick={() => {
                    const metadata = readRecord(group.message.metadata);
                    const replyTo = readRecord(metadata.replyTo);
                    const id =
                      readString(replyTo.id) ?? readString(replyTo.messageId);
                    handleQuoteClick(id);
                  }}
                  onReact={onReact}
                  onRemoveReaction={onRemoveReaction}
                  onReply={onReply}
                />
              )}
            </Fragment>
          );
        })}
        <div ref={endRef} />
      </div>

      <CrmMediaGalleryViewer
        initialIndex={galleryIndex}
        isOpen={galleryOpen}
        mediaList={galleryItems}
        onClose={() => setGalleryOpen(false)}
      />
    </>
  );
}

function hasDraggedFiles(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.types).includes("Files");
}
