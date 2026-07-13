import { Fragment, useEffect, useRef } from "react";
import { CrmWhatsappMediaMessageGroup } from "./CrmWhatsappMediaMessageGroup";
import { MessageBubble } from "./CrmWhatsappMessageBubble";
import type { MessageActionHandlers } from "./CrmWhatsappMessageActions";
import { groupMessagesForDisplay } from "./crmWhatsappMessageGroups";
import {
  formatWhatsappMessageDay,
  messageGroupTimestamp,
  shouldShowMessageDay,
} from "./crmWhatsappMessageDates";
import type { WhatsappMessageView } from "./crmWhatsappModel";

export function MessageList({
  actionsDisabled,
  isLoading,
  messages,
  onDelete,
  onReact,
  onRemoveReaction,
  onReply,
}: MessageActionHandlers & {
  isLoading: boolean;
  messages: WhatsappMessageView[];
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages]);

  if (isLoading) {
    return <div className="crm-whatsapp-empty">Carregando mensagens...</div>;
  }

  const groups = groupMessagesForDisplay(messages);
  return (
    <div className="crm-whatsapp-messages">
      {groups.map((group, index) => {
        const key =
          group.kind === "media"
            ? group.messages.map((message) => message.id).join(":")
            : (group.message.clientId ?? group.message.id);
        return (
          <Fragment key={key}>
            {shouldShowMessageDay(group, groups[index - 1]) ? (
              <time className="crm-whatsapp-message-day">
                {formatWhatsappMessageDay(messageGroupTimestamp(group))}
              </time>
            ) : null}
            {group.kind === "media" ? (
              <CrmWhatsappMediaMessageGroup
                actionsDisabled={actionsDisabled}
                messages={group.messages}
                onDelete={onDelete}
                onReact={onReact}
                onRemoveReaction={onRemoveReaction}
                onReply={onReply}
              />
            ) : (
              <MessageBubble
                actionsDisabled={actionsDisabled}
                message={group.message}
                onDelete={onDelete}
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
  );
}
