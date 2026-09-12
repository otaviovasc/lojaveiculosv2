import {
  Banknote,
  CalendarClock,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
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
  FeatureTableFrame,
} from "../../components/ui/FeatureTable";
import { FeatureToneIcon } from "../../components/ui/FeatureToneIcon";
import { cx } from "../../components/ui/featureShared";
import { Switch } from "../../components/ui/switch";
import type { SaleSellerOption } from "../sales/saleContextOptions";
import {
  autoEntryCalculationLabel,
  autoEntryOutputLabel,
  autoEntryTimingLabel,
} from "./autoEntryLabels";
import { AutoEntryFact, AutoEntryStat } from "./AutoEntryDomainPrimitives";
import { autoEntryMetaForTab } from "./domainMeta";
import type { AutoEntryRule } from "./types";

type RuleListView = "cards" | "list";

const VIEW_STORAGE_KEY = "auto_entries_rule_list_view";

/** View preference persisted like the other modules (CRM pipeline, inventory). */
function readStoredView(): RuleListView | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
  return stored === "cards" || stored === "list" ? stored : null;
}

function storeView(view: RuleListView) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VIEW_STORAGE_KEY, view);
}

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
  const [storedView, setStoredView] = useState<RuleListView | null>(
    readStoredView,
  );
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

  // Without a stored preference, many rules read better as a compact list.
  const view = storedView ?? (orderedRules.length > 4 ? "list" : "cards");
  const sellerLabel = (rule: AutoEntryRule) =>
    rule.sellerUserId
      ? (sellerNames.get(rule.sellerUserId) ?? "Vendedor específico")
      : "Todos os vendedores da origem";

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

  const changeView = (next: RuleListView) => {
    setStoredView(next);
    storeView(next);
  };

  const renderRuleCards = (className: string) => (
    <div className={className}>
      {orderedRules.map((rule) => {
        const isWorking = workingKey === rule.id;
        const isActive = rule.status === "active";
        const meta = autoEntryMetaForTab(rule.event);
        const Icon = meta.icon;
        return (
          <FeatureCard
            className={cx(
              "auto-entry-rule-card",
              `ae-tone--${meta.tone}`,
              !isActive && "is-paused",
            )}
            key={rule.id}
            padding="none"
          >
            <FeatureCardHeader
              actions={
                <div className="flex items-center gap-2.5">
                  <FeatureStatusBadge
                    className="auto-entry-rule-card__status"
                    tone={isActive ? "success" : "neutral"}
                  >
                    {isActive ? "Ativa" : "Pausada"}
                  </FeatureStatusBadge>
                  <Switch
                    aria-label={`Ativar regra ${rule.name}`}
                    checked={isActive}
                    disabled={!canManage || isWorking}
                    onCheckedChange={(checked) => onToggle(rule, checked)}
                    title={isActive ? "Pausar regra" : "Ativar regra"}
                  />
                </div>
              }
              className="auto-entry-rule-card__header"
              icon={<FeatureToneIcon icon={Icon} size="lg" />}
            >
              <FeatureCardTitle className="auto-entry-rule-card__title">
                {rule.name}
              </FeatureCardTitle>
              <p className="auto-entry-rule-card__meta mt-1 text-xs font-black uppercase tracking-wider">
                {meta.tab} · {rule.category} · prioridade {rule.priority}
              </p>
            </FeatureCardHeader>

            <div className="auto-entry-rule-card__body">
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <AutoEntryStat
                  icon={Banknote}
                  label="Lançamento"
                  value={`${autoEntryOutputLabel(rule.outputType)} · ${autoEntryCalculationLabel(rule.calculation)}`}
                />
                <AutoEntryStat
                  icon={CalendarClock}
                  label="Quando"
                  value={autoEntryTimingLabel(rule.timing)}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/50 pt-4">
                <AutoEntryFact
                  icon={Users}
                  label="Escopo do vendedor"
                  value={sellerLabel(rule)}
                />
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
    </div>
  );

  return (
    <section aria-label="Regras configuradas" className="grid gap-3">
      <div
        aria-label="Alternar visualização das regras"
        className="flex items-center justify-end gap-1 border border-line/50 rounded-lg overflow-hidden bg-app-elevated/45 w-fit ml-auto"
        role="group"
      >
        <button
          aria-label="Exibir como cartões"
          aria-pressed={view === "cards"}
          className={cx(
            "p-2 cursor-pointer transition-colors duration-150",
            view === "cards"
              ? "text-accent bg-line/20"
              : "text-muted hover:text-app-text hover:bg-line/25",
          )}
          onClick={() => changeView("cards")}
          title="Exibir como cartões"
          type="button"
        >
          <LayoutGrid aria-hidden="true" className="size-3.5" />
        </button>
        <button
          aria-label="Exibir como lista"
          aria-pressed={view === "list"}
          className={cx(
            "p-2 cursor-pointer transition-colors duration-150",
            view === "list"
              ? "text-accent bg-line/20"
              : "text-muted hover:text-app-text hover:bg-line/25",
          )}
          onClick={() => changeView("list")}
          title="Exibir como lista"
          type="button"
        >
          <List aria-hidden="true" className="size-3.5" />
        </button>
      </div>

      {view === "list" ? (
        <>
          <FeatureTableFrame className="hidden md:block">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead className="border-b border-line bg-app/45 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-black">Nome</th>
                  <th className="px-4 py-3 font-black">Origem</th>
                  <th className="px-4 py-3 font-black">Cálculo</th>
                  <th className="px-4 py-3 font-black">Vendedor</th>
                  <th className="px-4 py-3 font-black">Status</th>
                  <th className="px-4 py-3 font-black w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {orderedRules.map((rule) => {
                  const isWorking = workingKey === rule.id;
                  const isActive = rule.status === "active";
                  const meta = autoEntryMetaForTab(rule.event);
                  return (
                    <tr className="transition-colors" key={rule.id}>
                      <td className="px-4 py-3">
                        <strong className="block text-app-text font-extrabold">
                          {rule.name}
                        </strong>
                        <span className="mt-0.5 block text-xs font-semibold text-muted">
                          {rule.category} · prioridade {rule.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-muted">
                        {meta.tab}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-muted">
                        {autoEntryOutputLabel(rule.outputType)} ·{" "}
                        {autoEntryCalculationLabel(rule.calculation)}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-muted">
                        {sellerLabel(rule)}
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          aria-label={`Ativar regra ${rule.name}`}
                          checked={isActive}
                          disabled={!canManage || isWorking}
                          onCheckedChange={(checked) => onToggle(rule, checked)}
                          title={isActive ? "Pausar regra" : "Ativar regra"}
                        />
                      </td>
                      <td className="px-4 py-3">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </FeatureTableFrame>
          {/* Small screens always fall back to cards. */}
          {renderRuleCards("grid gap-4 lg:grid-cols-2 md:hidden")}
        </>
      ) : (
        renderRuleCards("grid gap-4 lg:grid-cols-2")
      )}
    </section>
  );
}
