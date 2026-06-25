import { Check } from "lucide-react";
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
  return (
    <aside className="rounded-lg border border-line bg-panel p-4 lg:sticky lg:top-4">
      <h3 className="text-sm font-black text-app-text">Resumo</h3>
      <dl className="mt-4 grid gap-3 text-xs font-bold text-muted">
        <SummaryRow label="Preco" value={formatCents(sale.salePriceCents)} />
        <SummaryRow
          label="Principal"
          value={formatCents(paymentPrincipalTotal(sale))}
        />
        <SummaryRow
          label="Autosave"
          value={isSaving ? "Salvando" : "Atualizado"}
        />
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        {missing.length ? <MissingChips missing={missing} /> : <ReadyMark />}
      </div>
      <div className="mt-5 grid gap-2">
        <button
          className="sales-primary-button"
          onClick={onReserve}
          type="button"
        >
          Reservar
        </button>
        <button
          className="sales-primary-button"
          onClick={onClose}
          type="button"
        >
          Fechar venda
        </button>
        <button
          className="sales-secondary-button"
          onClick={onCancel}
          type="button"
        >
          Cancelar
        </button>
      </div>
    </aside>
  );
}

function MissingChips({ missing }: { missing: readonly string[] }) {
  return missing.map((item) => (
    <span
      className="rounded-full border border-line px-2 py-1 text-[11px] font-black text-muted"
      key={item}
    >
      {item}
    </span>
  ));
}

function ReadyMark() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-black text-accent-strong">
      <Check className="size-4" />
      Pronta para fechar
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt>{label}</dt>
      <dd className="text-app-text">{value}</dd>
    </div>
  );
}
