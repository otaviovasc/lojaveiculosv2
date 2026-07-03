import { LockKeyhole } from "lucide-react";

export function CrmWhatsappReadOnlyComposer() {
  return (
    <div
      className="crm-whatsapp-composer crm-whatsapp-composer-readonly"
      role="note"
    >
      <LockKeyhole aria-hidden="true" />
      <span>
        <strong>Somente leitura</strong>
        <small>
          Seu perfil pode acompanhar esta conversa sem enviar mensagens.
        </small>
      </span>
    </div>
  );
}
