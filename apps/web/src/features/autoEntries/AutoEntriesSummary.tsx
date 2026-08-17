import { autoEntryDomains } from "./domainMeta";
import type { AutoEntryRule, AutoEntryWorkspaceTab } from "./types";
import { cx } from "../../components/ui/featureShared";

/**
 * Compact coverage strip rendered above the tab bar. Each domain pill jumps
 * to its tab; covered domains use the success tone, uncovered ones the
 * warning tone so gaps are visible before the user opens a tab.
 */
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
  const headingId = "auto-entries-coverage-heading";

  return (
    <section aria-labelledby={headingId} className="ae-summary-strip">
      <h2 className="ae-sr-only" id={headingId}>
        Cobertura da automação
      </h2>
      <ul aria-label="Domínios da automação" className="ae-summary__pills">
        {autoEntryDomains.map((domain) => {
          const count = activeRules.filter(
            (rule) => rule.event === domain.event,
          ).length;
          const ready = count > 0;
          return (
            <li key={domain.value}>
              <button
                aria-label={
                  ready
                    ? `${domain.tab}: ${count} regra(s) ativa(s)`
                    : `${domain.tab}: nenhuma regra ativa`
                }
                className={cx(
                  "ae-summary__pill",
                  ready ? "is-covered" : "is-missing",
                )}
                onClick={() => onSelectDomain?.(domain.value)}
                type="button"
              >
                {domain.tab} · {count}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="ae-summary__meter">
        <div aria-hidden="true" className="ae-summary__bar" role="presentation">
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
          {readyDomains}/{autoEntryDomains.length} domínios cobertos
        </p>
      </div>
    </section>
  );
}
