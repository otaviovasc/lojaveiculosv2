import { CheckCheck } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  formatMessageTime,
  getSenderLabel,
  type WhatsappMessageView,
} from "./crmWhatsappModel";
import type { CrmWhatsappMessage } from "./crmWhatsappTypes";

export function MessageList({
  isLoading,
  messages,
}: {
  isLoading: boolean;
  messages: WhatsappMessageView[];
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  if (isLoading) {
    return <div className="crm-whatsapp-empty">Carregando mensagens...</div>;
  }

  return (
    <div className="crm-whatsapp-messages">
      {messages.map((message) => (
        <MessageBubble key={message.clientId ?? message.id} message={message} />
      ))}
      <div ref={endRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: CrmWhatsappMessage }) {
  const outgoing = message.direction === "OUTBOUND";
  const senderLabel = getSenderLabel(message);
  return (
    <article
      className={
        outgoing
          ? "crm-whatsapp-bubble crm-whatsapp-bubble-out"
          : "crm-whatsapp-bubble"
      }
    >
      {senderLabel ? <strong>{senderLabel}</strong> : null}
      <MessageContent message={message} />
      <footer>
        <span>{formatMessageTime(message)}</span>
        {outgoing ? <CheckCheck aria-hidden="true" className="size-3" /> : null}
      </footer>
    </article>
  );
}

function MessageContent({ message }: { message: CrmWhatsappMessage }) {
  if (message.deletedAt) return <em>Esta mensagem foi apagada</em>;
  if (message.mediaUrl && message.type === "IMAGE") {
    return <img alt="Imagem enviada" src={message.mediaUrl} />;
  }
  if (message.mediaUrl && message.type === "VIDEO") {
    return <video controls src={message.mediaUrl} />;
  }
  if (message.mediaUrl && message.type === "AUDIO") {
    return <audio controls src={message.mediaUrl} />;
  }
  if (message.mediaUrl) {
    return (
      <a href={message.mediaUrl} rel="noreferrer" target="_blank">
        Abrir anexo
      </a>
    );
  }
  return <p>{message.content}</p>;
}
