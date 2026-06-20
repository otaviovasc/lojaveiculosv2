import { PlugZap } from "lucide-react";
import type { BillingProviderStatus } from "./types";

export function BillingProviderPanel({
  status,
}: {
  status: BillingProviderStatus;
}) {
  return (
    <section className="billing-panel billing-provider-panel">
      <PlugZap aria-hidden="true" className="size-5" />
      <div>
        <h3>
          {status.configured ? "Asaas runtime ativo" : "Asaas runtime pendente"}
        </h3>
        <p>
          {status.configured
            ? "Gateway e webhook ativos para reconciliacao de billing."
            : `Faltam: ${status.missingConfiguration.join(", ")}`}
        </p>
      </div>
    </section>
  );
}
