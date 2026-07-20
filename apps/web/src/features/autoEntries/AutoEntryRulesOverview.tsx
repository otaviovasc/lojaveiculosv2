import {
  Banknote,
  CalendarClock,
  ListChecks,
  ListFilter,
  Tags,
  UserRound,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import type { SaleSellerOption } from "../sales/saleContextOptions";
import {
  autoEntryCalculationLabel,
  autoEntryConditionLabel,
  autoEntryOutputLabel,
  autoEntryTimingLabel,
} from "./autoEntryLabels";
import {
  AutoEntryDomainCard,
  AutoEntryFact,
} from "./AutoEntryDomainPrimitives";
import { sellerName } from "./domainModel";
import type { AutoEntryEvent, AutoEntryRule } from "./types";

/**
 * Read-only list of every rule bound to the tab's origin event, so managers
 * can see at a glance who receives what, for which seller, and with which
 * value — including paused rules that the editing cards do not surface.
 */
export function AutoEntryRulesOverview({
  event,
  rules,
  sellers,
}: {
  event: AutoEntryEvent;
  rules: readonly AutoEntryRule[];
  sellers: readonly SaleSellerOption[];
}) {
  const ordered = useMemo(
    () =>
      rules
        .filter(
          (rule) =>
            rule.event === event && Boolean(rule.family || rule.ruleKey),
        )
        .sort((left, right) => compareRules(left, right, sellers)),
    [event, rules, sellers],
  );

  return (
    <AutoEntryDomainCard
      description="Beneficiário, vendedor que dispara, valor e prazo de cada regra desta origem."
      icon={ListChecks}
      title="Visão geral das regras"
    >
      {ordered.length === 0 ? (
        <p className="text-sm font-bold text-muted">
          Nenhuma regra desta origem foi configurada ainda.
        </p>
      ) : (
        <ul
          aria-label="Regras configuradas nesta origem"
          className="grid gap-2"
        >
          {ordered.map((rule) => {
            const condition = autoEntryConditionLabel(rule.conditions);
            return (
              <li className="ae-rule-item grid gap-3" key={rule.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm font-black text-app-text">
                    {rule.name}
                  </strong>
                  <FeatureStatusBadge
                    size="dense"
                    tone={rule.status === "active" ? "success" : "neutral"}
                  >
                    {rule.status === "active" ? "Ativa" : "Pausada"}
                  </FeatureStatusBadge>
                </div>
                <div className="grid gap-x-4 gap-y-2.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <AutoEntryFact
                    icon={Tags}
                    label="Tipo"
                    value={`${autoEntryOutputLabel(rule.outputType)} · ${rule.category}`}
                  />
                  <AutoEntryFact
                    icon={UserRound}
                    label="Beneficiário"
                    value={recipientLabel(rule, sellers)}
                  />
                  <AutoEntryFact
                    icon={Users}
                    label="Vendedor da origem"
                    value={scopeLabel(rule, sellers)}
                  />
                  <AutoEntryFact
                    icon={Banknote}
                    label="Valor"
                    value={autoEntryCalculationLabel(rule.calculation)}
                  />
                  <AutoEntryFact
                    icon={CalendarClock}
                    label="Prazo"
                    value={autoEntryTimingLabel(rule.timing)}
                  />
                  {condition ? (
                    <AutoEntryFact
                      icon={ListFilter}
                      label="Condição"
                      value={condition}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AutoEntryDomainCard>
  );
}

function recipientLabel(
  rule: AutoEntryRule,
  sellers: readonly SaleSellerOption[],
) {
  const recipient = rule.recipient;
  if (recipient?.kind === "fixed_user") {
    return sellerName(sellers, recipient.userId);
  }
  if (recipient?.kind === "event_seller") return "Vendedor da origem";
  return "Caixa da loja";
}

function scopeLabel(rule: AutoEntryRule, sellers: readonly SaleSellerOption[]) {
  return rule.sellerUserId
    ? sellerName(sellers, rule.sellerUserId)
    : "Todos os vendedores da origem";
}

/** Defaults (no seller scope) first, then per-seller rules grouped by name. */
function compareRules(
  left: AutoEntryRule,
  right: AutoEntryRule,
  sellers: readonly SaleSellerOption[],
) {
  if (left.status !== right.status) return left.status === "active" ? -1 : 1;
  if (left.sellerUserId !== right.sellerUserId) {
    if (!left.sellerUserId) return -1;
    if (!right.sellerUserId) return 1;
    const bySeller = sellerName(sellers, left.sellerUserId).localeCompare(
      sellerName(sellers, right.sellerUserId),
    );
    if (bySeller !== 0) return bySeller;
  }
  return right.priority - left.priority || left.name.localeCompare(right.name);
}
