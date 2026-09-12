import { Bot, CheckCircle2, ShieldAlert, Sparkles, Users } from "lucide-react";
import { autoEntryDomains } from "./domainMeta";
import type { AutoEntryRule, AutoEntryWorkspaceTab } from "./types";
import { cx } from "../../components/ui/featureShared";

export function AutoEntriesSummary({
  onSelectDomain,
  rules,
}: {
  onSelectDomain?: (tab: AutoEntryWorkspaceTab) => void;
  rules: readonly AutoEntryRule[];
}) {
  const activeRules = rules.filter((rule) => rule.status === "active");
  const readyDomains = autoEntryDomains.filter((domain) =>
    activeRules.some((rule) => rule.event === domain.event),
  ).length;
  const uniqueSellersWithRules = new Set(
    rules.map((rule) => rule.sellerUserId).filter(Boolean),
  ).size;

  const headingId = "auto-entries-coverage-heading";

  return (
    <section
      aria-labelledby={headingId}
      className="ae-summary-strip rounded-2xl border border-line bg-panel p-4 md:p-5 shadow-sm space-y-4"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-accent-strong flex items-center gap-1.5">
            <Sparkles aria-hidden="true" className="size-3.5" />
            Automação Financeira da Loja
          </span>
          <h2
            className="text-base md:text-lg font-extrabold text-text"
            id={headingId}
          >
            Cobertura da automação
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Gera lançamentos de comissão, repasses e despesas automaticamente ao
            fechar vendas e operações.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-app-elevated px-3 py-2">
            <Bot aria-hidden="true" className="size-4 text-accent" />
            <div>
              <span className="block text-xs uppercase font-bold text-muted">
                Regras Ativas
              </span>
              <strong className="text-sm font-extrabold text-text tabular-nums">
                {activeRules.length}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-line bg-app-elevated px-3 py-2">
            <CheckCircle2 aria-hidden="true" className="size-4 text-success" />
            <div>
              <span className="block text-xs uppercase font-bold text-muted">
                Cobertura
              </span>
              <strong className="text-sm font-extrabold text-text tabular-nums">
                {readyDomains}/{autoEntryDomains.length}
              </strong>
            </div>
          </div>

          {uniqueSellersWithRules > 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-line bg-app-elevated px-3 py-2">
              <Users aria-hidden="true" className="size-4 text-info-start" />
              <div>
                <span className="block text-xs uppercase font-bold text-muted">
                  Vendedores
                </span>
                <strong className="text-sm font-extrabold text-text tabular-nums">
                  {uniqueSellersWithRules}
                </strong>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-line/60 text-xs text-muted">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-text">Cobertura por domínio:</span>
          <div className="w-32 md:w-48 h-2 rounded-full bg-app-elevated overflow-hidden border border-line">
            <div
              className="h-full bg-accent transition-all duration-300 rounded-full"
              style={{
                width: `${Math.round((readyDomains / autoEntryDomains.length) * 100)}%`,
              }}
            />
          </div>
          <span className="font-extrabold text-accent-strong tabular-nums">
            {Math.round((readyDomains / autoEntryDomains.length) * 100)}%
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted">
          {autoEntryDomains.map((domain) => {
            const count = activeRules.filter(
              (rule) => rule.event === domain.event,
            ).length;
            const ready = count > 0;
            return (
              <span
                className={cx(
                  "inline-flex items-center gap-1",
                  ready ? "text-text font-bold" : "text-muted/70",
                )}
                key={domain.value}
              >
                <span
                  className={cx(
                    "size-1.5 rounded-full",
                    ready ? "bg-success" : "bg-muted/40",
                  )}
                />
                {domain.tab} ({count})
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
