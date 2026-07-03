import { Image as ImageIcon, MessageSquareText, Music } from "lucide-react";
import type { CrmWhatsappQuickMessage } from "./crmWhatsappTypes";

export function CrmWhatsappQuickMessagePicker({
  activeIndex,
  messages,
  onPick,
}: {
  activeIndex: number;
  messages: CrmWhatsappQuickMessage[];
  onPick: (message: CrmWhatsappQuickMessage) => void;
}) {
  if (!messages.length) {
    return (
      <div className="crm-whatsapp-quick-picker">
        <p className="crm-whatsapp-quick-empty">
          Crie sua primeira mensagem rapida e use digitando / no campo de texto.
        </p>
      </div>
    );
  }
  return (
    <div className="crm-whatsapp-quick-picker">
      {messages.slice(0, 6).map((message, index) => (
        <button
          className={
            index === activeIndex
              ? "crm-whatsapp-quick-option active"
              : "crm-whatsapp-quick-option"
          }
          key={message.id}
          onClick={() => onPick(message)}
          onMouseDown={(event) => event.preventDefault()}
          type="button"
        >
          <span>{message.shortcut}</span>
          <strong>{message.title}</strong>
          <small>
            <QuickKindIcon message={message} />
            {message.kind === "TEXT" ? message.content : message.kind}
          </small>
        </button>
      ))}
    </div>
  );
}

function QuickKindIcon({ message }: { message: CrmWhatsappQuickMessage }) {
  if (message.kind === "IMAGE") return <ImageIcon aria-hidden="true" />;
  if (message.kind === "AUDIO") return <Music aria-hidden="true" />;
  return <MessageSquareText aria-hidden="true" />;
}
