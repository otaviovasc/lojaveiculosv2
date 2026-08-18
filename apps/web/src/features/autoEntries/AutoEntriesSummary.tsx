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

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line/60">
        <span className="text-xs font-bold text-muted mr-1">Origens:</span>
        {autoEntryDomains.map((domain) => {
          const count = activeRules.filter(
            (rule) => rule.event === domain.event,
          ).length;
          const ready = count > 0;
          return (
            <button
              aria-label={
                ready
                  ? `${domain.tab}: ${count} regra(s) ativa(s)`
                  : `${domain.tab}: nenhuma regra ativa`
              }
              className={cx(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 cursor-pointer",
                ready
                  ? "border-accent/30 bg-accent-soft text-accent-strong"
                  : "border-line bg-app text-muted hover:border-line-strong hover:text-text",
              )}
              key={domain.value}
              onClick={() => onSelectDomain?.(domain.value)}
              type="button"
            >
              <span>{domain.tab}</span>
              <span
                className={cx(
                  "rounded-full px-1.5 py-0.2 text-xs font-extrabold tabular-nums",
                  ready
                    ? "bg-accent/20 text-accent-strong"
                    : "bg-line text-muted",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
