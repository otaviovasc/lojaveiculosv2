import { Download, FileBarChart2, PlusCircle, ReceiptText } from "lucide-react";
import { FinanceBadge } from "./FinanceFormParts";

export function FinanceBillsHeader({
  onCreate,
  onExport,
  onReports,
}: {
  onCreate: () => void;
  onExport: () => void;
  onReports: () => void;
}) {
  return (
    <section className="rounded-lg border border-line bg-panel p-5 shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <FinanceBadge>Financeiro V2</FinanceBadge>
            <FinanceBadge>Contas e recibos</FinanceBadge>
          </div>
          <h2 className="text-2xl font-black text-app-text lg:text-4xl">
            Gastos e contas
          </h2>
          <p className="max-w-3xl text-sm font-bold text-muted">
            Fluxo de caixa da loja com vencimentos, status de pagamento,
            recorrencias e comprovantes anexados por descritores V2.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-app px-4 text-sm font-black text-app-text"
            onClick={onExport}
            type="button"
          >
            <Download aria-hidden="true" className="size-4" />
            Exportar CSV
          </button>
          <button
            className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-app px-4 text-sm font-black text-app-text"
            onClick={onReports}
            type="button"
          >
            <FileBarChart2 aria-hidden="true" className="size-4" />
            Relatorios
          </button>
          <button
            className="flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-inverse"
            onClick={onCreate}
            type="button"
          >
            <PlusCircle aria-hidden="true" className="size-4" />
            Novo lancamento
          </button>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm font-black text-accent-strong">
        <ReceiptText aria-hidden="true" className="size-4" />
        Recibos usam upload assinado e vinculo auditado ao lancamento financeiro.
      </div>
    </section>
  );
}
