import { CircleCheck, TriangleAlert } from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { cx } from "../../components/ui/featureShared";
import { autoEntryDomains } from "./domainMeta";
import type { AutoEntryRule } from "./types";

export function AutoEntriesSummary({
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
    <FeatureSection
      className="ae-summary"
      description={
        complete
          ? "Todos os domínios operacionais possuem ao menos uma regra ativa."
          : `${missing} ${missing === 1 ? "domínio ainda não tem" : "domínios ainda não têm"} regra ativa. Revise a cobertura para não perder lançamentos.`
      }
      icon={
        complete ? (
          <CircleCheck className="size-5" />
        ) : (
          <TriangleAlert className="size-5" />
        )
      }
      title="Cobertura da automação"
    >
      <div className="ae-summary__body">
        <ul aria-label="Domínios da automação" className="ae-summary__pills">
          {autoEntryDomains.map((domain) => {
            const count = activeRules.filter(
              (rule) => rule.event === domain.event,
            ).length;
            const ready = count > 0;
            return (
              <li
                className={cx("ae-summary__pill", `ae-tone--${domain.tone}`)}
                key={domain.value}
              >
                <FeatureStatusBadge
                  size="dense"
                  tone={ready ? "success" : "neutral"}
                >
                  {domain.tab} · {count}
                </FeatureStatusBadge>
              </li>
            );
          })}
        </ul>
        <div className="ae-summary__meter">
          <div
            aria-hidden="true"
            className="ae-summary__bar"
            role="presentation"
          >
            <span
              className="ae-summary__bar-fill"
              style={{
                width: `${Math.round(
                  (readyDomains / autoEntryDomains.length) * 100,
                )}%`,
              }}
            />
          </div>
          <p className="ae-summary__stats">
            {activeRules.length} ativa(s) · {pausedRules.length} pausada(s) ·{" "}
            {readyDomains}/{autoEntryDomains.length} domínios
          </p>
        </div>
      </div>
    </FeatureSection>
  );
}
