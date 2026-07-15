import { Bot, CircleCheck, CirclePause, TriangleAlert } from "lucide-react";
import { FeatureCard } from "../../components/ui/FeatureCards";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import type { AutoEntryRule } from "./types";

const domainEvents = [
  "vehicle_sale_closed",
  "financing_approved",
  "transfer_documentation_charged",
  "insurance_issued",
  "consortium_sold",
] as const;

export function AutoEntriesOverview({
  rules,
}: {
  rules: readonly AutoEntryRule[];
}) {
  const activeRules = rules.filter((rule) => rule.status === "active");
  const pausedRules = rules.filter((rule) => rule.status === "inactive");

  const readyDomains = domainEvents.filter((event) =>
    activeRules.some((rule) => rule.event === event),
  ).length;
  const domainsWithoutActiveRules = domainEvents.length - readyDomains;

  return (
    <FeatureCard
      ariaLabel="Cobertura das regras automáticas"
      className="auto-entries-overview"
      padding="compact"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent-soft text-accent-strong">
          <Bot aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-black leading-tight text-app-text">
            Automação financeira
          </h2>
          <p className="mt-1 text-xs font-bold text-muted">
            {domainsWithoutActiveRules > 0
              ? `${domainsWithoutActiveRules} ${domainsWithoutActiveRules === 1 ? "domínio precisa" : "domínios precisam"} de uma regra ativa. Use as abas para revisar a cobertura.`
              : "Os cinco domínios operacionais possuem ao menos uma regra ativa."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <FeatureStatusBadge tone="success">
          <CircleCheck aria-hidden="true" className="size-3.5" />
          {activeRules.length} ativas
        </FeatureStatusBadge>
        {pausedRules.length ? (
          <FeatureStatusBadge tone="warning">
            <CirclePause aria-hidden="true" className="size-3.5" />
            {pausedRules.length} pausadas
          </FeatureStatusBadge>
        ) : null}
        <FeatureStatusBadge
          tone={domainsWithoutActiveRules ? "danger" : "success"}
        >
          <TriangleAlert aria-hidden="true" className="size-3.5" />
          {readyDomains}/{domainEvents.length} domínios
        </FeatureStatusBadge>
      </div>
    </FeatureCard>
  );
}
