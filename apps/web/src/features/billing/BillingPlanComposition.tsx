import { Boxes, Check, PackagePlus, Sparkles } from "lucide-react";
import { useState } from "react";
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
}) {
  const [selectedFeatureKey, setSelectedFeatureKey] =
    useState<EntitlementKey | null>(null);
  const selectedRow =
    overview.entitlementMatrix.find(
      (row) => row.featureKey === selectedFeatureKey,
    ) ?? null;
  const included = overview.entitlementMatrix.filter(
    (row) => row.includedInPlan,
  );
  const publishedAddonFeatures = new Set(
    overview.addons
      .filter((addon) => addon.status === "active")
      .map((addon) => addon.featureKey),
  );
  const packages = overview.entitlementMatrix.filter(
    (row) => !row.includedInPlan && publishedAddonFeatures.has(row.featureKey),
  );
  const pricing = billingStorePricing(overview);
  const plan = overview.subscription?.plan;
  const planLimits = billingPlanLimitHighlights(overview);

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
            Você mantém a base da operação e adiciona novas capacidades sem
            trocar de plano.
          </p>
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
              packages.filter((row) => isEnabled(row.status)).length,
            )}
          </span>
        </div>

        <div className="billing-package-grid">
          {packages.map((row) => (
            <BillingPackageCard
              canManage={canManage}
              key={row.featureKey}
              priceLabel={billingPackagePriceLabel(row, overview)}
              row={row}
              onSelect={() => setSelectedFeatureKey(row.featureKey)}
            />
          ))}
        </div>
      </div>

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
    </section>
  );
}

function activePackageLabel(count: number) {
  return `${count} ${count === 1 ? "ativo" : "ativos"}`;
}
