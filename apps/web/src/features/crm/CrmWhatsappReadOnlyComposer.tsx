import { LockKeyhole } from "lucide-react";

export function CrmWhatsappReadOnlyComposer({
  reason,
}: {
  reason?: string | null;
}) {
  return (
    <div
      className="crm-whatsapp-composer crm-whatsapp-composer-readonly"
      role="note"
    >
      <LockKeyhole aria-hidden="true" />
      <span>
        <strong>Somente leitura</strong>
        <small>
          {reason ??
            "Seu perfil pode acompanhar esta conversa sem enviar mensagens."}
        </small>
      </span>
    </div>
  );
}
