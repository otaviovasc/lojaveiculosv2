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
  hasBuyerName,
  paymentPrincipalTotal,
  saleMissingFields,
} from "./salesModel";
import { SummaryRow } from "./SaleSummaryPanelParts";
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
  const closeMissing = saleMissingFields(sale, "close");
  const reserveMissing = saleMissingFields(sale, "reserve");
  const isCloseReady = closeMissing.length === 0;
  const isReserveReady = reserveMissing.length === 0;

  const totalPaid = paymentPrincipalTotal(sale);
  const signalAmount = sale.payments[0]?.amountCents ?? 0;
  const salePrice = sale.salePriceCents ?? 0;
  const balance = salePrice - totalPaid;
  const canClose =
    isCloseReady && (sale.status === "draft" || sale.status === "pending");
  const canReserve = isReserveReady && sale.status === "draft";
  const canCancel = sale.status === "draft" || sale.status === "pending";
  const isTerminal = sale.status === "closed" || sale.status === "cancelled";
  const cancelLabel =
    sale.status === "pending" ? "Cancelar reserva" : "Cancelar rascunho";

  const checks = [
    {
      label: "Comprador Identificado",
      ok: hasBuyerName(sale.buyerSnapshot),
      desc: "Nome do comprador pendente",
    },
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
      label: "Sinal de Reserva",
      ok: signalAmount > 0,
      desc: "Sinal de reserva pendente",
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
        <span className="text-xs font-bold text-muted uppercase tracking-wider mb-1">
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
                  <span className="text-xs font-bold text-warning-strong mt-0.5">
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
        {sale.status === "closed" ? (
          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-3 py-2 rounded-xl border border-emerald-500/20 text-xs font-black mb-1 uppercase tracking-wider justify-center">
            <CheckCircle2 className="size-4" />
            <span>Venda fechada</span>
          </div>
        ) : sale.status === "cancelled" ? (
          <div className="flex items-center gap-2 bg-danger/10 text-danger px-3 py-2 rounded-xl border border-danger/20 text-xs font-black mb-1 uppercase tracking-wider justify-center">
            <X className="size-4" />
            <span>Venda cancelada</span>
          </div>
        ) : sale.status === "pending" ? (
          <div className="flex items-center gap-2 bg-warning/10 text-warning px-3 py-2 rounded-xl border border-warning/20 text-xs font-black mb-1 uppercase tracking-wider justify-center">
            <ShieldAlert className="size-4" />
            <span>Reserva ativa</span>
          </div>
        ) : isCloseReady ? (
          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-3 py-2 rounded-xl border border-emerald-500/20 text-xs font-black mb-1 uppercase tracking-wider justify-center">
            <CheckCircle2 className="size-4" />
            <span>Pronta para Emitir</span>
          </div>
        ) : isReserveReady ? (
          <div className="flex items-center gap-2 bg-accent/10 text-accent px-3 py-2 rounded-xl border border-accent/20 text-xs font-black mb-1 uppercase tracking-wider justify-center">
            <CheckCircle2 className="size-4" />
            <span>Pronta para Reservar</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-warning/5 text-warning px-3 py-2 rounded-xl border border-warning/10 text-xs font-bold mb-1 justify-center">
            <ShieldAlert className="size-4 shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider">
              Aguardando Pendências
            </span>
          </div>
        )}

        {isTerminal ? null : (
          <>
            <button
              className="sales-primary-button w-full"
              disabled={!canClose}
              onClick={onClose}
              style={{
                opacity: canClose ? 1 : 0.5,
                cursor: canClose ? "pointer" : "not-allowed",
                boxShadow: canClose ? undefined : "none",
              }}
              type="button"
            >
              <div className="gloss-overlay" />
              Fechar Venda
            </button>

            <button
              className="sales-secondary-button w-full"
              disabled={!canReserve}
              onClick={onReserve}
              style={{
                opacity: canReserve ? 1 : 0.5,
                cursor: canReserve ? "pointer" : "not-allowed",
              }}
              type="button"
            >
              Reservar Veículo
            </button>

            <button
              className="sales-secondary-button w-full !text-muted hover:!text-rose-500 hover:!border-rose-500/40"
              disabled={!canCancel}
              onClick={onCancel}
              type="button"
            >
              {cancelLabel}
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
