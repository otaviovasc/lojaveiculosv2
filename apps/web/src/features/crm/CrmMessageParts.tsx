import { Fragment, useEffect, useRef } from "react";
import { CrmMediaMessageGroup } from "./CrmMediaMessageGroup";
import { MessageBubble } from "./CrmMessageBubble";
import type { MessageActionHandlers } from "./CrmMessageActions";
import { groupMessagesForDisplay } from "./crmMessageGroups";
import {
  formatCrmMessageDay,
  messageGroupTimestamp,
  shouldShowMessageDay,
} from "./crmMessageDates";
import type { CrmMessageView } from "./crmConversationModel";
import { MessageListSkeleton } from "./CrmSkeletons";

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
  messages: CrmMessageView[];
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages]);

  if (isLoading) {
    return <MessageListSkeleton />;
  }

  const groups = groupMessagesForDisplay(messages);
  return (
    <div className="crm-messages">
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
