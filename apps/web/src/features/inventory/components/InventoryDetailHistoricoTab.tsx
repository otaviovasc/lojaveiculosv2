import { Clock, Database, Sparkles } from "lucide-react";
import type { InventoryListingDetail } from "../model/types";
import { buildInventoryHistoryEvents } from "./InventoryDetailHistoryModel";

export function InventoryDetailHistoricoTab({
  detail,
}: {
  detail: InventoryListingDetail;
}) {
  const events = buildInventoryHistoryEvents(detail);

  return (
    <div className="flex w-full max-w-none flex-col gap-6 text-app-text">
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
          <Sparkles className="size-4 shrink-0 text-muted" />
          <span>Insights de IA</span>
        </h3>
        <p className="text-xs font-bold leading-relaxed text-muted">
          Nenhuma análise de giro, mercado ou risco foi gerada para este
          veículo. Esta área será habilitada quando existir uma análise
          persistida e identificada pelo provedor.
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
        <div className="border-b border-line pb-3">
          <h3 className="flex items-center gap-1.5 text-sm font-black uppercase tracking-wider">
            <Clock className="size-4 shrink-0 text-muted" />
            <span>Histórico operacional</span>
          </h3>
        </div>

        <ol className="relative flex flex-col gap-5 border-l border-line/60 pl-4">
          {events.map((event) => (
            <li key={event.id} className="relative flex flex-col gap-1 text-xs">
              <span className="absolute -left-[21px] top-1 size-2.5 rounded-full border border-panel bg-accent" />
              <span className="font-black text-app-text">{event.title}</span>
              <span className="font-bold text-muted">{event.detail}</span>
              <time
                className="font-bold text-muted"
                dateTime={event.occurredAt}
              >
                {event.formattedDate}
              </time>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex gap-3 rounded-2xl border border-line bg-panel p-5">
        <Database className="mt-0.5 size-4 shrink-0 text-muted" />
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-black uppercase tracking-wider">
            Trilho de auditoria
          </h3>
          <p className="text-xs font-bold leading-relaxed text-muted">
            O cadastro registra eventos de auditoria no backend, mas ainda não
            existe uma consulta por veículo para esta tela. Operadores e ações
            detalhadas não são simulados localmente.
          </p>
        </div>
      </section>
    </div>
  );
}
