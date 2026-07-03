import { Check, Coins, Plus } from "lucide-react";
import { SaleFormSection } from "./SaleWorkspaceForm";
import { PaymentRow, newPayment } from "./SalePaymentRow";
import { paymentPrincipalTotal } from "./salesModel";
import { formatCents } from "./saleServicesFormat";
import type { UpdateSale } from "./SaleServicesTypes";
import type { SaleRecord } from "./types";

export function SaleServicesPaymentsSection({
  sale,
  update,
}: {
  sale: SaleRecord;
  update: UpdateSale;
}) {
  const totalPaid = paymentPrincipalTotal(sale);
  const salePrice = sale.salePriceCents ?? 0;
  const balance = salePrice - totalPaid;
  const progressPercent =
    salePrice > 0 ? Math.min(100, (totalPaid / salePrice) * 100) : 0;

  const addPayment = () =>
    update((draft) => ({
      ...draft,
      payments: [
        ...draft.payments,
        newPayment(draft.salePriceCents ?? 0, draft.payments.length),
      ],
    }));

  return (
    <SaleFormSection
      icon={<Coins className="size-4.5 text-accent" />}
      title="2. Condições de Pagamento / Parcelas"
    >
      <div className="md:col-span-2 flex flex-col gap-4">
        <div className="sales-glass-panel p-4 bg-app-elevated/40 border border-line flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-muted uppercase tracking-wider">
              Progressão de Quitação
            </span>
            <span className="text-app-text font-black">
              {formatCents(totalPaid)} de {formatCents(salePrice)} (
              {progressPercent.toFixed(0)}%)
            </span>
          </div>

          <div className="sales-progress-bar-container w-full h-2 bg-line rounded-full overflow-hidden">
            <div
              className={
                balance <= 0
                  ? "h-full rounded-full transition-all duration-300 bg-emerald-500"
                  : "h-full rounded-full transition-all duration-300 bg-accent"
              }
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-muted">
              Total Lançado: {sale.payments.length} parcelas
            </span>
            {balance <= 0 ? (
              <span className="text-emerald-500 font-black flex items-center gap-1 uppercase tracking-wider">
                <Check className="size-3" /> Valor Total Coberto
              </span>
            ) : (
              <span className="text-rose-500 font-black uppercase tracking-wider animate-pulse">
                Faltam: {formatCents(balance)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {sale.payments.map((payment, index) => (
            <PaymentRow
              index={index}
              key={payment.id}
              onChange={(next) =>
                update((draft) => ({
                  ...draft,
                  payments: draft.payments.map((item, itemIndex) =>
                    itemIndex === index ? next : item,
                  ),
                }))
              }
              onRemove={() =>
                update((draft) => ({
                  ...draft,
                  payments: draft.payments.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                }))
              }
              payment={payment}
            />
          ))}
          <button
            className="sales-secondary-button w-full border-dashed"
            onClick={addPayment}
            type="button"
          >
            <Plus className="size-4 text-accent" />
            Adicionar Linha de Pagamento
          </button>
        </div>
      </div>
    </SaleFormSection>
  );
}
