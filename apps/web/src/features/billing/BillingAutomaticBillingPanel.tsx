import { Building2, CreditCard, Percent, WalletCards } from "lucide-react";
import type { BillingOverview } from "./types";
import { money } from "./billingFormat";

export function BillingAutomaticBillingPanel({
  overview,
}: {
  overview: BillingOverview;
}) {
  const preview = overview.chargePreview;
  const authority = overview.authority;

  return (
    <section className="billing-panel billing-auto-panel">
      <header className="billing-panel-header billing-auto-header">
        <div>
          <h3>Cobranca automatica mensal</h3>
          <p>{authority.summary}</p>
        </div>
        <span className="billing-authority-pill">
          <Building2 aria-hidden="true" className="size-4" />
          {authority.managerLabel}
        </span>
      </header>

      <div className="billing-auto-summary">
        <div>
          <CreditCard aria-hidden="true" className="size-5" />
          <span>Cobranca</span>
          <strong>
            {preview.collectionMethod === "card_on_file"
              ? "Assinatura Asaas"
              : preview.collectionMethod}
          </strong>
        </div>
        <div>
          <WalletCards aria-hidden="true" className="size-5" />
          <span>Total mensal</span>
          <strong>{money(preview.totalCents)}</strong>
        </div>
        <div>
          <Percent aria-hidden="true" className="size-5" />
          <span>Politica</span>
          <strong>
            {preview.hasAgencyDiscount ? "Com desconto" : "Sem taxa de agencia"}
          </strong>
        </div>
      </div>

      <div className="billing-table-wrap">
        <table className="billing-table billing-charge-table">
          <thead>
            <tr>
              <th>Loja</th>
              <th>Cobravel</th>
              <th>Unitario</th>
              <th>Qtd.</th>
              <th>Rateio</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {preview.lineItems.length ? (
              preview.lineItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.storeName ?? "Sem loja"}</td>
                  <td>
                    <strong>{item.label}</strong>
                    <span>{itemTypeLabel(item.itemType)}</span>
                  </td>
                  <td>{money(item.unitAmountCents)}</td>
                  <td>{item.quantity}</td>
                  <td>{sharePercent(item.allocationPercent)}</td>
                  <td>
                    <strong>{money(item.amountCents)}</strong>
                    {item.prorationApplied ? (
                      <span>
                        Prorata {factorPercent(item.prorationFactor)} de{" "}
                        {money(item.fullAmountCents)}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>Nenhum item de assinatura alocado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="billing-charge-list">
        {preview.lineItems.length ? (
          preview.lineItems.map((item) => (
            <div className="billing-charge-line" key={item.id}>
              <div>
                <span>{item.storeName ?? "Sem loja"}</span>
                <strong>{item.label}</strong>
                <p>
                  {itemTypeLabel(item.itemType)} · {money(item.unitAmountCents)}
                  {" x "}
                  {item.quantity}
                </p>
              </div>
              <div>
                <strong>{money(item.amountCents)}</strong>
                <span>{sharePercent(item.allocationPercent)} do total</span>
                {item.prorationApplied ? (
                  <span>
                    {factorPercent(item.prorationFactor)} de{" "}
                    {money(item.fullAmountCents)}
                  </span>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <p className="billing-muted">Nenhum item de assinatura alocado.</p>
        )}
      </div>
    </section>
  );
}

function itemTypeLabel(itemType: "addon" | "plan") {
  return itemType === "plan" ? "Plano" : "Add-on";
}

function factorPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function sharePercent(value: number) {
  return `${value.toFixed(2)}%`;
}
