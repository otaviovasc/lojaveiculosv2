import { ArrowLeft, CalendarClock, Receipt } from "lucide-react";
import { ConnectionSectionCard } from "./CrmWhatsappConnectionAdminParts";

export function CrmWhatsappZapiSetup({ onBack }: { onBack: () => void }) {
  return (
    <ConnectionSectionCard
      description="Contratação junto da assinatura e configuração feita pela nossa equipe."
      icon={<CalendarClock aria-hidden="true" />}
      title="Adicionar Z-API ao CRM"
    >
      <div className="grid gap-2">
        <p className="text-sm leading-relaxed text-muted">
          Consulte o valor atual na sua assinatura. A solicitação é programada
          para o próximo vencimento, sem cobrança no meio do ciclo e sem alterar
          a data atual ou os outros adicionais.
        </p>
        <p className="text-sm leading-relaxed text-muted">
          Depois que o pagamento for confirmado, nossa equipe compra e configura
          o canal para sua loja.
        </p>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          className="crm-action crm-action-secondary"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar
        </button>
        <button
          className="crm-action crm-action-primary"
          onClick={() => {
            window.location.hash = "#/billing";
          }}
          type="button"
        >
          <Receipt aria-hidden="true" className="size-4" />
          Ver assinatura
        </button>
      </div>
    </ConnectionSectionCard>
  );
}
