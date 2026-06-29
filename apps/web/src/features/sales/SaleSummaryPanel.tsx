import {
  AlertCircle,
  Check,
  CheckCircle2,
  ShieldAlert,
  ShoppingBag,
  X,
} from "lucide-react";
import {
  formatCents,
  paymentPrincipalTotal,
  saleMissingFields,
} from "./salesModel";
import type { SaleRecord } from "./types";

export function StickySaleSummary({
  isSaving,
  onCancel,
  onClose,
  onReserve,
  sale,
}: {
  isSaving: boolean;
  onCancel: () => void;
  onClose: () => void;
  onReserve: () => void;
  sale: SaleRecord;
}) {
  const missing = saleMissingFields(sale);
  const isReady = missing.length === 0;

  const totalPaid = paymentPrincipalTotal(sale);
  const salePrice = sale.salePriceCents ?? 0;
  const balance = salePrice - totalPaid;

  // Requirements checklist
  const checks = [
    {
      label: "Lead Vinculado",
      ok: !!sale.leadId,
      desc: "Venda sem lead do CRM",
    },
    {
      label: "Veículo Definido",
      ok: !!sale.unitId,
      desc: "Nenhum veículo selecionado",
    },
    {
      label: "Preço Comercial",
      ok: !!sale.salePriceCents,
      desc: "Preço de venda zerado",
    },
    {
      label: "Quitação de Parcelas",
      ok: sale.salePriceCents ? totalPaid >= sale.salePriceCents : false,
      desc:
        balance > 0 ? `Restam ${formatCents(balance)}` : "Pagamentos pendentes",
    },
    {
      label: "Operador/Vendedor",
      ok: !!sale.sellerUserId,
      desc: "Vendedor pendente",
    },
  ];

  return (
    <aside className="sales-glass-panel sales-summary-aside border border-line">
      <div className="flex items-center gap-2 border-b border-line/50 pb-3 mb-2">
        <ShoppingBag className="size-4.5 text-accent" />
        <h3 className="text-sm font-black text-app-text uppercase tracking-wider">
          Resumo Geral
        </h3>
      </div>

      <dl className="grid gap-3 text-xs font-bold">
        <SummaryRow
          label="Preço Acordado"
          value={
            sale.salePriceCents ? formatCents(sale.salePriceCents) : "R$ 0,00"
          }
        />
        <SummaryRow
          label="Total Lançado"
          value={formatCents(totalPaid)}
          valueClassName={
            totalPaid >= salePrice && salePrice > 0
              ? "text-emerald-500 font-black"
              : "text-app-text"
          }
        />
        {balance > 0 && salePrice > 0 && (
          <SummaryRow
            label="Saldo devedor"
            value={formatCents(balance)}
            valueClassName="text-rose-500 font-black"
          />
        )}
        <SummaryRow
          label="Sincronização"
          value={isSaving ? "Salvando..." : "Sincronizado"}
          valueClassName={isSaving ? "text-accent animate-pulse" : "text-muted"}
        />
      </dl>

      <div className="sales-summary-divider" />

      {/* Structured Completion Checklist */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">
          Requisitos de Fechamento
        </span>
        <div className="flex flex-col gap-2 bg-app-elevated/40 p-3 rounded-xl border border-line/40">
          {checks.map((check) => (
            <div key={check.label} className="flex items-start gap-2 text-xs">
              {check.ok ? (
                <Check className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="size-4 text-warning shrink-0 mt-0.5" />
              )}
              <div className="flex flex-col">
                <span
                  className={
                    "font-bold " + (check.ok ? "text-app-text" : "text-muted")
                  }
                >
                  {check.label}
                </span>
                {!check.ok && (
                  <span className="text-[9px] font-bold text-warning-strong mt-0.5">
                    {check.desc}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sales-summary-divider" />

      <div className="grid gap-2 mt-1">
        {isReady ? (
          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-3 py-2 rounded-xl border border-emerald-500/20 text-xs font-black mb-1 uppercase tracking-wider justify-center">
            <CheckCircle2 className="size-4" />
            <span>Pronta para Emitir</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-warning/5 text-warning px-3 py-2 rounded-xl border border-warning/10 text-xs font-bold mb-1 justify-center">
            <ShieldAlert className="size-4 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider">
              Aguardando Pendências
            </span>
          </div>
        )}

        <button
          className="sales-primary-button w-full"
          disabled={!isReady}
          onClick={onClose}
          style={{
            opacity: isReady ? 1 : 0.5,
            cursor: isReady ? "pointer" : "not-allowed",
            boxShadow: isReady ? undefined : "none",
          }}
          type="button"
        >
          Fechar Venda
        </button>

        <button
          className="sales-secondary-button w-full"
          onClick={onReserve}
          type="button"
        >
          Reservar Veículo
        </button>

        <button
          className="sales-secondary-button w-full !text-muted hover:!text-rose-500 hover:!border-rose-500/40"
          onClick={onCancel}
          type="button"
        >
          Cancelar Draft
        </button>
      </div>
    </aside>
  );
}

function SummaryRow({
  label,
  value,
  valueClassName = "text-app-text",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <dt className="text-muted font-bold">{label}</dt>
      <dd className={valueClassName}>{value}</dd>
    </div>
  );
}
