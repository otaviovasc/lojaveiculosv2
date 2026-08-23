import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
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
import {
  readRecord,
  readString,
  sanitizeCrmMessageUrl,
} from "./crmMessageHelpers";
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
  hasOlderMessages = false,
  isLoadingOlderMessages = false,
  olderMessagesError = false,
  onLoadOlder,
}: MessageActionHandlers & {
  hasOlderMessages?: boolean;
  isLoading: boolean;
  isLoadingOlderMessages?: boolean;
  messages: CrmMessageView[];
  onFilesDropped?: ((files: File[]) => void) | undefined;
  onLoadOlder?: (() => Promise<boolean>) | undefined;
  olderMessagesError?: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const hasInitialPositionRef = useRef(false);
  const previousMessagesRef = useRef<CrmMessageView[]>([]);
  const pendingPrependRef = useRef<{
    scrollHeight: number;
    scrollTop: number;
  } | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    if (!messages.length) {
      previousMessagesRef.current = messages;
      hasInitialPositionRef.current = false;
      isNearBottomRef.current = true;
      return;
    }
    const previousMessages = previousMessagesRef.current;
    const previousMessageIdentities = new Set(
      previousMessages.flatMap(messageIdentityKeys),
    );
    const hasSharedMessage = messages.some((message) =>
      messageIdentityKeys(message).some((identity) =>
        previousMessageIdentities.has(identity),
      ),
    );
    const hasChangedConversation =
      previousMessages.length > 0 && !hasSharedMessage;
    const previousClientIds = new Set(
      previousMessages.flatMap((message) =>
        message.clientId ? [message.clientId] : [],
      ),
    );
    const hasNewOwnMessage = messages.some(
      (message) =>
        message.direction === "OUTBOUND" &&
        Boolean(message.clientId) &&
        !previousClientIds.has(message.clientId ?? ""),
    );
    const shouldScroll =
      !hasInitialPositionRef.current ||
      hasChangedConversation ||
      isNearBottomRef.current ||
      hasNewOwnMessage;
    previousMessagesRef.current = messages;
    hasInitialPositionRef.current = true;
    if (!shouldScroll) return;
    endRef.current?.scrollIntoView?.({ block: "end" });
    isNearBottomRef.current = true;
  }, [messages]);

  useLayoutEffect(() => {
    const pending = pendingPrependRef.current;
    const list = listRef.current;
    if (!pending || !list) return;
    list.scrollTop =
      pending.scrollTop + Math.max(0, list.scrollHeight - pending.scrollHeight);
    pendingPrependRef.current = null;
    isNearBottomRef.current = isNearMessageListBottom(list);
  }, [messages]);

  // Extract all media items for the gallery viewer
  const galleryItems = useMemo<CrmGalleryMediaItem[]>(() => {
    const items: CrmGalleryMediaItem[] = [];
    for (const msg of messages) {
      const mediaUrl = sanitizeCrmMessageUrl(msg.mediaUrl);
      if (
        mediaUrl &&
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
          url: mediaUrl,
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

  const handleLoadOlder = useCallback(async () => {
    const list = listRef.current;
    if (!list || !onLoadOlder || isLoadingOlderMessages) return;
    pendingPrependRef.current = {
      scrollHeight: list.scrollHeight,
      scrollTop: list.scrollTop,
    };
    try {
      const loaded = await onLoadOlder();
      if (!loaded) pendingPrependRef.current = null;
    } catch {
      pendingPrependRef.current = null;
    }
  }, [isLoadingOlderMessages, onLoadOlder]);

  if (isLoading) {
    return <MessageListSkeleton />;
  }

  const groups = groupMessagesForDisplay(messages);
  return (
    <>
      <div
        className="crm-messages"
        onScroll={(event) => {
          isNearBottomRef.current = isNearMessageListBottom(
            event.currentTarget,
          );
        }}
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
        ref={listRef}
      >
        {onLoadOlder ? (
          <div className="flex flex-col items-center gap-2">
            {hasOlderMessages || olderMessagesError ? (
              <button
                className="crm-action crm-action-secondary"
                disabled={isLoadingOlderMessages}
                onClick={() => void handleLoadOlder()}
                type="button"
              >
                {isLoadingOlderMessages
                  ? "Carregando mensagens..."
                  : olderMessagesError
                    ? "Tentar novamente"
                    : "Carregar mensagens anteriores"}
              </button>
            ) : (
              <span className="text-xs font-bold text-muted">
                Início da conversa
              </span>
            )}
            {olderMessagesError ? (
              <span className="text-xs font-bold text-danger" role="status">
                Não foi possível carregar as mensagens anteriores.
              </span>
            ) : null}
          </div>
        ) : null}
        {!messages.length ? (
          <div className="crm-message-empty" role="status">
            <strong>Nenhuma mensagem ainda</strong>
            <span>As mensagens desta conversa aparecerão aqui.</span>
          </div>
        ) : null}
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

function isNearMessageListBottom(element: HTMLDivElement) {
  const remaining =
    element.scrollHeight - element.scrollTop - element.clientHeight;
  return remaining <= 96;
}

function messageIdentityKeys(message: CrmMessageView) {
  return [
    `id:${String(message.id)}`,
    ...(message.clientId ? [`client:${message.clientId}`] : []),
  ];
}
