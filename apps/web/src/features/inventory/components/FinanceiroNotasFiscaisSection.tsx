import { ArrowRight, FileSpreadsheet, ShieldCheck } from "lucide-react";

export function FinanceiroNotasFiscaisSection() {
  return (
    <section
      aria-labelledby="vehicle-fiscal-title"
      className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet aria-hidden="true" className="size-4 text-muted" />
          <h3
            className="text-sm font-black uppercase tracking-wider"
            id="vehicle-fiscal-title"
          >
            Notas fiscais
          </h3>
        </div>
        <span className="rounded-full border border-success-strong/20 bg-green-soft px-2.5 py-1 text-xs font-black text-success-strong">
          Fluxo oficial
        </span>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-line bg-app/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-soft text-success-strong">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <strong className="text-sm font-black text-app-text">
              Emissão e acompanhamento auditáveis
            </strong>
            <p className="mt-1 max-w-2xl text-sm font-bold leading-6 text-muted">
              Consulte a operação fiscal para revisar a venda de origem,
              confirmar a emissão e acompanhar o retorno do provedor. Este
              detalhe não cria notas ou valores locais.
            </p>
          </div>
        </div>
        <a
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-black text-accent-foreground transition-colors hover:bg-accent-strong hover:text-accent-strong-foreground"
          href="#/fiscal"
        >
          Abrir Fiscal
          <ArrowRight aria-hidden="true" className="size-4" />
        </a>
      </div>
    </section>
  );
}
