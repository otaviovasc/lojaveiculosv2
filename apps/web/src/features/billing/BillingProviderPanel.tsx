import type { BillingProviderStatus } from "./types";

export function BillingProviderPanel({
  status,
}: {
  status: BillingProviderStatus;
}) {
  return (
    <section className="billing-panel billing-provider-panel">
      <span className="billing-status-dot">
        <span aria-hidden="true" className={status.configured ? "is-on" : ""} />
      </span>
      <div>
        <h3>{status.configured ? "Asaas online" : "Asaas pendente"}</h3>
        <p>
          {status.configured
            ? "Checkout e webhook prontos para reconciliacao."
            : `Faltam: ${status.missingConfiguration.join(", ")}`}
        </p>
      </div>
    </section>
  );
}
