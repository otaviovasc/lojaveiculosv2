import { useEffect, useRef } from "react";
import { CrmWhatsappMediaMessageGroup } from "./CrmWhatsappMediaMessageGroup";
import { MessageBubble } from "./CrmWhatsappMessageBubble";
import type { MessageActionHandlers } from "./CrmWhatsappMessageActions";
import { groupMessagesForDisplay } from "./crmWhatsappMessageGroups";
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

  return (
    <div className="crm-whatsapp-messages">
      {groupMessagesForDisplay(messages).map((group) =>
        group.kind === "media" ? (
          <CrmWhatsappMediaMessageGroup
            actionsDisabled={actionsDisabled}
            key={group.messages.map((message) => message.id).join(":")}
            messages={group.messages}
            onDelete={onDelete}
            onReact={onReact}
            onRemoveReaction={onRemoveReaction}
            onReply={onReply}
          />
        ) : (
          <MessageBubble
            actionsDisabled={actionsDisabled}
            key={group.message.clientId ?? group.message.id}
            message={group.message}
            onDelete={onDelete}
            onReact={onReact}
            onRemoveReaction={onRemoveReaction}
            onReply={onReply}
          />
        ),
      )}
      <div ref={endRef} />
    </div>
  );
}
