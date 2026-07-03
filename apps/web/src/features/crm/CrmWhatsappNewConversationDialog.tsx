import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { ActionDialog } from "./CrmWhatsappActionDialogFrame";

export type StartConversationDraft = {
  buyerName?: string;
  phone: string;
  text: string;
};

export function CrmWhatsappNewConversationDialog({
  disabled,
  onClose,
  onStart,
}: {
  disabled?: boolean;
  onClose: () => void;
  onStart: (input: StartConversationDraft) => Promise<boolean>;
}) {
  const [buyerName, setBuyerName] = useState("");
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const canSubmit = isValidPhone(phone) && text.trim().length > 0;
  return (
    <ActionDialog
      disabled={disabled || isSaving || !canSubmit}
      icon={<MessageSquarePlus />}
      onClose={onClose}
      onSubmit={async () => {
        if (!canSubmit) return;
        setIsSaving(true);
        try {
          const accepted = await onStart({
            ...(buyerName.trim() ? { buyerName: buyerName.trim() } : {}),
            phone: phone.trim(),
            text: text.trim(),
          });
          if (accepted) onClose();
        } finally {
          setIsSaving(false);
        }
      }}
      title="Nova conversa"
    >
      <label>
        Nome
        <input
          disabled={disabled || isSaving}
          onChange={(event) => setBuyerName(event.target.value)}
          placeholder="Nome do cliente"
          value={buyerName}
        />
      </label>
      <label>
        WhatsApp
        <input
          disabled={disabled || isSaving}
          inputMode="tel"
          onChange={(event) => setPhone(event.target.value)}
          placeholder="(11) 99999-9999"
          value={phone}
        />
      </label>
      <label>
        Mensagem
        <textarea
          disabled={disabled || isSaving}
          onChange={(event) => setText(event.target.value)}
          placeholder="Digite a primeira mensagem"
          rows={4}
          value={text}
        />
      </label>
    </ActionDialog>
  );
}

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}
