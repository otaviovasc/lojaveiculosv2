import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import {
  FeatureCard,
  FeatureCardHeader,
  FeatureCardTitle,
} from "../../components/ui/FeatureCards";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import {
  FeatureEmptyState,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
import {
  FeatureRowAction,
  FeatureRowActions,
} from "../../components/ui/FeatureTable";
import { cx } from "../../components/ui/featureShared";
import { Switch } from "../../components/ui/switch";
import type { SaleSellerOption } from "../sales/saleContextOptions";
import {
  autoEntryCalculationLabel,
  autoEntryOutputLabel,
  autoEntryTimingLabel,
} from "./autoEntryLabels";
import { autoEntryMetaForTab } from "./domainMeta";
import type { AutoEntryRule } from "./types";

export function AutoEntryRuleList({
  canManage,
  onCreate,
  onDelete,
  onEdit,
  onToggle,
  rules,
  sellers,
  workingKey,
}: {
  canManage: boolean;
  onCreate: () => void;
  onDelete: (rule: AutoEntryRule) => void;
  onEdit: (rule: AutoEntryRule) => void;
  onToggle: (rule: AutoEntryRule, active: boolean) => void;
  rules: readonly AutoEntryRule[];
  sellers: readonly SaleSellerOption[];
  workingKey: string | null;
}) {
  const sellerNames = useMemo(
    () => new Map(sellers.map((seller) => [seller.id, seller.label])),
    [sellers],
  );
  const orderedRules = useMemo(
    () =>
      [...rules].sort(
        (left, right) =>
          right.priority - left.priority || left.name.localeCompare(right.name),
      ),
    [rules],
  );

  if (orderedRules.length === 0) {
    return (
      <FeatureEmptyState
        action={
          canManage ? (
            <FeatureActionButton
              icon={Plus}
              label="Criar primeira regra"
              onClick={onCreate}
              variant="primary"
            />
          ) : null
        }
        body="Nenhum lançamento automático foi configurado para esta origem. O sistema não criará registros por conta própria."
        icon={Plus}
        title="Nenhuma regra configurada"
      />
    );
  }

  return (
    <section
      aria-label="Regras configuradas"
      className="grid gap-4 lg:grid-cols-2"
    >
      {orderedRules.map((rule) => {
        const isWorking = workingKey === rule.id;
        const isActive = rule.status === "active";
        const meta = autoEntryMetaForTab(rule.event);
        const Icon = meta.icon;
        const sellerName = rule.sellerUserId
          ? (sellerNames.get(rule.sellerUserId) ?? "Vendedor específico")
          : "Todos os vendedores da origem";
        return (
          <FeatureCard
            className={cx(
              "auto-entry-rule-card",
              `ae-tone--${meta.tone}`,
              !isActive && "is-paused",
            )}
            key={rule.id}
            padding="compact"
          >
            <FeatureCardHeader
              actions={
                <FeatureStatusBadge tone={isActive ? "success" : "neutral"}>
                  {isActive ? "Ativa" : "Pausada"}
                </FeatureStatusBadge>
              }
              icon={
                <span
                  aria-hidden="true"
                  className="auto-entry-rule-card__badge"
                >
                  <Icon className="size-4" />
                </span>
              }
            >
              <FeatureCardTitle>{rule.name}</FeatureCardTitle>
              <p className="mt-1 text-xs font-black uppercase tracking-wider text-muted">
                {meta.tab} · {rule.category} · prioridade {rule.priority}
              </p>
            </FeatureCardHeader>

            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-line/60 bg-app-elevated p-3">
                <dt className="text-xs font-black uppercase tracking-wider text-muted">
                  Lançamento
                </dt>
                <dd className="mt-1 font-black text-app-text">
                  {autoEntryOutputLabel(rule.outputType)} ·{" "}
                  {autoEntryCalculationLabel(rule.calculation)}
                </dd>
              </div>
              <div className="rounded-lg border border-line/60 bg-app-elevated p-3">
                <dt className="text-xs font-black uppercase tracking-wider text-muted">
                  Quando
                </dt>
                <dd className="mt-1 font-black text-app-text">
                  {autoEntryTimingLabel(rule.timing)}
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/50 pt-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-muted">
                  Escopo do vendedor
                </p>
                <p className="mt-1 text-sm font-black text-app-text">
                  {sellerName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-black text-muted">
                  Ativa
                  <Switch
                    aria-label={`Ativar regra ${rule.name}`}
                    checked={isActive}
                    disabled={!canManage || isWorking}
                    onCheckedChange={(checked) => onToggle(rule, checked)}
                  />
                </label>
                {canManage ? (
                  <FeatureRowActions>
                    <FeatureRowAction
                      ariaLabel={`Editar regra ${rule.name}`}
                      disabled={isWorking}
                      icon={Pencil}
                      onClick={() => onEdit(rule)}
                      tooltip="Editar regra"
                    />
                    <FeatureRowAction
                      ariaLabel={`Excluir regra ${rule.name}`}
                      disabled={isWorking}
                      icon={Trash2}
                      iconClassName="text-danger"
                      onClick={() => onDelete(rule)}
                      tooltip="Excluir regra"
                    />
                  </FeatureRowActions>
                ) : null}
              </div>
            </div>
          </FeatureCard>
        );
      })}
    </section>
  );
}
