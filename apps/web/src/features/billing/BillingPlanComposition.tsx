import { Boxes, Check, PackagePlus, Sparkles } from "lucide-react";
import { useState } from "react";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { BillingFeatureDialog } from "./BillingFeatureDialog";
import { featureLabels, isEnabled, money } from "./billingFormat";
import {
  BillingPackageCard,
  BillingPriceLine,
  billingLimitCopy,
  billingPackagePriceLabel,
  billingPlanLimitHighlights,
  billingStorePricing,
} from "./BillingPlanCompositionParts";
import type {
  BillingEntitlementStatus,
  BillingOverview,
  EntitlementKey,
} from "./types";

export function BillingPlanComposition({
  canManage,
  contextLabel,
  onReasonChange,
  onUpdate,
  overview,
  reasons,
  savingFeatureKey,
  selectedAddonIds,
  selectedPlanId,
  onAddonToggle,
  onPlanSelect,
  onSaveSelection,
  selectionSaving = false,
}: {
  canManage: boolean;
  contextLabel?: string;
  onReasonChange: (featureKey: EntitlementKey, reason: string) => void;
  onUpdate: (
    featureKey: EntitlementKey,
    status: BillingEntitlementStatus,
  ) => Promise<void>;
  overview: BillingOverview;
  reasons: Record<string, string>;
  savingFeatureKey: EntitlementKey | null;
  selectedAddonIds?: readonly string[];
  selectedPlanId?: string | null;
  onAddonToggle?: (addonId: string) => void;
  onPlanSelect?: (planId: string) => void;
  onSaveSelection?: () => Promise<void>;
  selectionSaving?: boolean;
}) {
  const [selectedFeatureKey, setSelectedFeatureKey] =
    useState<EntitlementKey | null>(null);
  const selectedRow =
    overview.entitlementMatrix.find(
      (row) => row.featureKey === selectedFeatureKey,
    ) ?? null;
  const selectionMode = Boolean(onPlanSelect && onAddonToggle);
  const plan =
    overview.plans.find((candidate) => candidate.id === selectedPlanId) ??
    overview.subscription?.plan ??
    (!selectionMode
      ? overview.plans.find((candidate) => candidate.status === "active")
      : undefined);
  const included = (plan?.features ?? [])
    .filter((feature) => feature.included)
    .map(
      (feature) =>
        overview.entitlementMatrix.find(
          (row) => row.featureKey === feature.featureKey,
        ) ?? {
          endsAt: null,
          featureKey: feature.featureKey,
          includedInPlan: true,
          limitValue: feature.limitValue,
          source: null,
          startsAt: null,
          status: "inactive" as const,
        },
    );
  const activeAddons = overview.addons.filter(
    (addon) =>
      addon.status === "active" &&
      (!plan || addon.catalogVersion === plan.catalogVersion),
  );
  const packages = activeAddons.map((addon) => ({
    addon,
    row: overview.entitlementMatrix.find(
      (row) => row.featureKey === addon.featureKey,
    ) ?? {
      endsAt: null,
      featureKey: addon.featureKey,
      includedInPlan: false,
      limitValue: null,
      source: null,
      startsAt: null,
      status: "inactive" as const,
    },
  }));
  const storedPricing = billingStorePricing(overview);
  const selectedAddonTotal = activeAddons
    .filter((addon) => selectedAddonIds?.includes(addon.id))
    .reduce((sum, addon) => sum + addon.monthlyPriceCents, 0);
  const pricing = selectionMode
    ? {
        addonCents: selectedAddonTotal,
        planCents: plan?.monthlyPriceCents ?? 0,
        totalCents: (plan?.monthlyPriceCents ?? 0) + selectedAddonTotal,
      }
    : storedPricing;
  const planLimits = billingPlanLimitHighlights(plan);
  const paidSubscription =
    overview.subscription?.status === "active" ||
    overview.subscription?.status === "past_due";

  return (
    <section className="billing-composition">
      <header className="billing-composition-header">
        <div>
          <span className="billing-section-label">
            <Sparkles aria-hidden="true" /> Sua assinatura
          </span>
          <h2>Uma base completa, com espaço para sua loja crescer</h2>
          <p>
            {contextLabel
              ? `${contextLabel}: veja o que já está incluído e escolha apenas os pacotes que fazem sentido.`
              : "Veja o que já está incluído e amplie sua operação apenas quando fizer sentido."}
          </p>
          {selectionMode && overview.plans.length ? (
            <div className="billing-plan-selector">
              <span>Plano após o teste</span>
              <FeatureSelect
                ariaLabel="Plano após o teste"
                className="w-full"
                value={plan?.id ?? ""}
                onChange={(value) => onPlanSelect?.(value)}
                options={[
                  {
                    disabled: true,
                    label: "Escolha um plano",
                    value: "",
                  },
                  ...overview.plans
                    .filter((candidate) => candidate.status === "active")
                    .map((candidate) => ({
                      label: `${candidate.name} — ${money(candidate.monthlyPriceCents)}/mês`,
                      value: candidate.id,
                    })),
                ]}
              />
            </div>
          ) : null}
        </div>
      </header>

      <div className="billing-composition-grid">
        <article className="billing-base-plan-card">
          <div className="billing-base-plan-heading">
            <span className="billing-plan-icon" aria-hidden="true">
              <Boxes />
            </span>
            <div>
              <span>Plano base</span>
              <h3>{plan?.name ?? "Plano da loja"}</h3>
            </div>
            <strong>{money(pricing.planCents)}/mês</strong>
          </div>
          <p className="billing-plan-promise">
            Tudo o que sua equipe precisa para vender, organizar o estoque e
            atender clientes em uma única operação.
          </p>
          <div className="billing-included-list">
            {planLimits.map((limit) => (
              <div key={limit}>
                <Check aria-hidden="true" />
                <span>
                  <strong>{limit}</strong>
                  <small>Limite aplicado à assinatura</small>
                </span>
              </div>
            ))}
            {included.map((row) => (
              <div key={row.featureKey}>
                <Check aria-hidden="true" />
                <span>
                  <strong>{featureLabels[row.featureKey]}</strong>
                  <small>{billingLimitCopy(row)}</small>
                </span>
              </div>
            ))}
          </div>
        </article>

        <aside className="billing-price-summary" aria-label="Resumo mensal">
          <span className="billing-section-label">Investimento mensal</span>
          <BillingPriceLine label="Plano base" value={pricing.planCents} />
          <BillingPriceLine
            label="Pacotes adicionais"
            value={pricing.addonCents}
          />
          <div className="billing-price-total">
            <span>Total atual</span>
            <strong>{money(pricing.totalCents)}</strong>
            <small>por mês</small>
          </div>
          <p>
            Durante o teste nada é cobrado. Esta é a composição escolhida para a
            primeira cobrança ou para o próximo ciclo.
          </p>
          {onSaveSelection ? (
            <button
              className="billing-selection-save"
              disabled={!plan || selectionSaving}
              onClick={() => void onSaveSelection()}
              type="button"
            >
              {selectionSaving
                ? "Salvando…"
                : paidSubscription
                  ? "Salvar e atualizar no Asaas"
                  : "Salvar escolha"}
            </button>
          ) : null}
        </aside>
      </div>

      <div className="billing-package-section">
        <div className="billing-package-heading">
          <div>
            <span className="billing-section-label">
              <PackagePlus aria-hidden="true" /> Pacotes adicionais
            </span>
            <h3>Leve sua operação além</h3>
            <p>
              Escolha soluções com impacto direto no atendimento, na escala e na
              conformidade da sua loja.
            </p>
          </div>
          <span className="billing-package-count">
            {activePackageLabel(
              selectionMode
                ? (selectedAddonIds?.length ?? 0)
                : packages.filter(({ row }) => isEnabled(row.status)).length,
            )}
          </span>
        </div>

        <div className="billing-package-grid">
          {packages.map(({ addon, row }) => (
            <BillingPackageCard
              canManage={canManage}
              {...(selectionMode
                ? {
                    detail: addon.includedInTrial
                      ? "Incluído no teste gratuito"
                      : "Fora do teste gratuito",
                  }
                : {})}
              key={addon.id}
              label={addon.name}
              priceLabel={billingPackagePriceLabel(row, overview)}
              row={row}
              selected={
                selectionMode ? selectedAddonIds?.includes(addon.id) : undefined
              }
              selectionMode={selectionMode}
              onSelect={() =>
                selectionMode
                  ? onAddonToggle?.(addon.id)
                  : setSelectedFeatureKey(row.featureKey)
              }
            />
          ))}
        </div>
      </div>

      {!selectionMode ? (
        <BillingFeatureDialog
          isSaving={Boolean(
            selectedRow && savingFeatureKey === selectedRow.featureKey,
          )}
          priceLabel={
            selectedRow ? billingPackagePriceLabel(selectedRow, overview) : ""
          }
          reason={selectedRow ? (reasons[selectedRow.featureKey] ?? "") : ""}
          row={selectedRow}
          onClose={() => setSelectedFeatureKey(null)}
          onReasonChange={onReasonChange}
          onUpdate={onUpdate}
        />
      ) : null}
    </section>
  );
}

function activePackageLabel(count: number) {
  return `${count} ${count === 1 ? "ativo" : "ativos"}`;
}
