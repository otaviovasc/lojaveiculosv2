import { useRef, type KeyboardEvent } from "react";
import { cx } from "../../components/ui/featureShared";
import { autoEntryTabsMeta } from "./domainMeta";
import type { AutoEntryRule, AutoEntryWorkspaceTab } from "./types";

export function AutoEntriesTabs({
  onChange,
  rules,
  value,
}: {
  onChange: (value: AutoEntryWorkspaceTab) => void;
  rules: readonly AutoEntryRule[];
  value: AutoEntryWorkspaceTab;
}) {
  const activeRules = rules.filter((rule) => rule.status === "active");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = autoEntryTabsMeta.findIndex((tab) => tab.value === value);

  const moveFocus = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    const count = autoEntryTabsMeta.length;
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % count;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + count) % count;
    } else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = count - 1;

    const next = nextIndex === null ? undefined : autoEntryTabsMeta[nextIndex];
    if (nextIndex === null || !next) return;
    event.preventDefault();
    onChange(next.value);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div
      aria-label="Origem dos lançamentos automáticos"
      className="ae-tabs"
      role="tablist"
    >
      {autoEntryTabsMeta.map((meta, index) => {
        const Icon = meta.icon;
        const active = meta.value === value;
        const count = countForTab(activeRules, meta.value);
        return (
          <button
            aria-selected={active}
            className={cx(
              "ae-tab",
              `ae-tone--${meta.tone}`,
              active && "is-active",
            )}
            key={meta.value}
            onClick={() => onChange(meta.value)}
            onKeyDown={(event) => moveFocus(event, index)}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            role="tab"
            tabIndex={active || (activeIndex < 0 && index === 0) ? 0 : -1}
            type="button"
          >
            <span aria-hidden="true" className="ae-tab__icon">
              <Icon className="size-4" />
            </span>
            <span className="ae-tab__label">{meta.tab}</span>
            <span aria-hidden="true" className="ae-tab__count">
              {count}
            </span>
            <span
              aria-hidden="true"
              className={cx("ae-tab__dot", count > 0 && "is-ready")}
            />
          </button>
        );
      })}
    </div>
  );
}

function countForTab(
  rules: readonly AutoEntryRule[],
  tab: AutoEntryWorkspaceTab,
) {
  if (tab === "custom") {
    return rules.filter((rule) => !rule.family && !rule.ruleKey).length;
  }
  return rules.filter(
    (rule) => Boolean(rule.family || rule.ruleKey) && rule.event === tab,
  ).length;
}
