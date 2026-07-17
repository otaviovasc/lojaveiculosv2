import { CircleCheck, CirclePause, TriangleAlert } from "lucide-react";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { cx } from "../../components/ui/featureShared";
import { autoEntryDomains } from "./domainMeta";
import type { AutoEntryRule } from "./types";

export function AutoEntriesOverview({
  rules,
}: {
  rules: readonly AutoEntryRule[];
}) {
  const activeRules = rules.filter((rule) => rule.status === "active");
  const pausedRules = rules.filter((rule) => rule.status === "inactive");

  const readyDomains = autoEntryDomains.filter((domain) =>
    activeRules.some((rule) => rule.event === domain.event),
  ).length;
  const missing = autoEntryDomains.length - readyDomains;
  const complete = missing === 0;

  return (
    <section
      aria-label="Cobertura das regras automáticas"
      className="auto-entries-hero"
    >
      <div className="auto-entries-hero__top">
        <div className="auto-entries-hero__intro">
          <span
            aria-hidden="true"
            className={cx(
              "auto-entries-hero__status",
              complete ? "is-complete" : "is-incomplete",
            )}
          >
            {complete ? (
              <CircleCheck className="size-5" />
            ) : (
              <TriangleAlert className="size-5" />
            )}
          </span>
          <div className="min-w-0">
            <p className="auto-entries-hero__eyebrow">Cobertura da automação</p>
            <p className="auto-entries-hero__subtitle">
              {complete
                ? "Todos os domínios operacionais possuem ao menos uma regra ativa."
                : `${missing} ${missing === 1 ? "domínio ainda não tem" : "domínios ainda não têm"} regra ativa. Revise a cobertura para não perder lançamentos.`}
            </p>
          </div>
        </div>
        <div className="auto-entries-hero__stats">
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
          <FeatureStatusBadge tone={missing ? "danger" : "success"}>
            <TriangleAlert aria-hidden="true" className="size-3.5" />
            {readyDomains}/{autoEntryDomains.length} domínios
          </FeatureStatusBadge>
        </div>
      </div>

      <ul aria-label="Cobertura por domínio" className="auto-entries-coverage">
        {autoEntryDomains.map((domain) => {
          const Icon = domain.icon;
          const count = activeRules.filter(
            (rule) => rule.event === domain.event,
          ).length;
          const ready = count > 0;
          return (
            <li
              className={cx(
                "auto-entries-coverage__item",
                `ae-tone--${domain.tone}`,
                ready && "is-ready",
              )}
              key={domain.value}
            >
              <span aria-hidden="true" className="auto-entries-coverage__icon">
                <Icon className="size-4" />
              </span>
              <div className="auto-entries-coverage__body">
                <span className="auto-entries-coverage__label">
                  {domain.tab}
                </span>
                <span className="auto-entries-coverage__status">
                  <span
                    aria-hidden="true"
                    className="auto-entries-coverage__dot"
                  />
                  {ready ? "Regra ativa" : "Sem regra ativa"}
                </span>
              </div>
              <span className="auto-entries-coverage__count">{count}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
