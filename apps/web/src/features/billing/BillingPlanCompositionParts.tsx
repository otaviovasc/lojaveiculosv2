import { Check, CheckCircle2, Info, Plus, Sparkles } from "lucide-react";
import {
  featureLabels,
  featureValueCopy,
  isEnabled,
  money,
} from "./billingFormat";
import type {
  BillingEntitlementMatrixRow,
  BillingOverview,
  BillingPlan,
} from "./types";

export function BillingPackageCard({
  canManage,
  detail,
  label,
  onSelect,
  priceLabel,
  row,
  selected,
  selectionMode = false,
}: {
  canManage: boolean;
  detail?: string;
  label?: string;
  onSelect: () => void;
  priceLabel: string;
  row: BillingEntitlementMatrixRow;
  selected?: boolean | undefined;
  selectionMode?: boolean;
}) {
  const displayLabel = label ?? featureLabels[row.featureKey] ?? "Pacote";
  const enabled = isEnabled(row.status);

  return (
    <article
      className={`billing-package-card ${selected ? "is-selected" : ""} ${
        enabled ? "is-enabled" : ""
      }`}
    >
      <div className="billing-package-card-header">
        <span className="billing-package-card-icon" aria-hidden="true">
          {enabled ? (
            <CheckCircle2 className="size-5 text-success-strong" />
          ) : (
            <Sparkles className="size-5 text-accent-strong" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3>{displayLabel}</h3>
          {detail ? (
            <span className="billing-package-card-detail">{detail}</span>
          ) : (
            <span className="billing-package-card-detail">
              {enabled ? "Ativo na assinatura" : "Disponível para adicionar"}
            </span>
          )}
        </div>
        <strong className="billing-package-card-price">{priceLabel}</strong>
      </div>

      <p className="billing-package-card-desc">
        {featureValueCopy[row.featureKey] ??
          "Potencialize a gestão e os resultados da sua loja com este módulo adicional."}
      </p>

      <div className="billing-package-card-footer">
        {selectionMode ? (
          <button
            className={`billing-package-action-btn ${
              selected ? "is-active" : ""
            }`}
            disabled={!canManage}
            onClick={onSelect}
            type="button"
          >
            {selected ? (
              <>
                <Check className="size-4" aria-hidden="true" />
                Remover da escolha
              </>
            ) : (
              <>
                <Plus className="size-4" aria-hidden="true" />
                Adicionar à escolha
              </>
            )}
          </button>
        ) : (
          <button
            className="billing-package-detail-btn"
            onClick={onSelect}
            type="button"
          >
            <Info className="size-4" aria-hidden="true" />
            Ver detalhes
          </button>
        )}
      </div>
    </article>
  );
}

export function BillingPriceLine({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{money(value)}</span>
    </div>
  );
}

export function billingStorePricing(overview: BillingOverview) {
  const lines = overview.chargePreview.lineItems.filter(
    (item) => item.storeId === overview.storeId,
  );
  const planCents =
    lines
      .filter((item) => item.itemType === "plan")
      .reduce((sum, item) => sum + item.fullAmountCents, 0) ||
    overview.subscription?.plan?.monthlyPriceCents ||
    overview.plans.find((plan) => plan.status === "active")
      ?.monthlyPriceCents ||
    0;
  const addonCents = lines
    .filter((item) => item.itemType === "addon")
    .reduce((sum, item) => sum + item.fullAmountCents, 0);
  const allocation = overview.allocations.find(
    (item) => item.storeId === overview.storeId,
  );
  return {
    addonCents,
    planCents,
    totalCents: allocation?.monthlyAmountCents ?? planCents + addonCents,
  };
}

export function billingPackagePriceLabel(
  row: BillingEntitlementMatrixRow,
  overview: BillingOverview,
) {
  const addon = overview.addons.find(
    (item) =>
      item.featureKey === row.featureKey &&
      item.status === "active" &&
      (!overview.subscription?.plan ||
        item.catalogVersion === overview.subscription.plan.catalogVersion),
  );
  if (addon) return `${money(addon.monthlyPriceCents)}/mês`;
  const label = featureLabels[row.featureKey].toLowerCase();
  const line = overview.chargePreview.lineItems.find(
    (item) =>
      item.itemType === "addon" &&
      item.label.toLowerCase().includes(label) &&
      (item.storeId === overview.storeId || !item.storeId),
  );
  return line ? `${money(line.unitAmountCents)}/mês` : "Sob consulta";
}

export function billingPlanLimitHighlights(
  plan: BillingPlan | null | undefined,
) {
  const limits = plan?.limits;
  return [
    limits?.vehicleLimit
      ? `Até ${limits.vehicleLimit.toLocaleString("pt-BR")} veículos em estoque`
      : null,
    limits?.sellerLimit
      ? `Até ${limits.sellerLimit.toLocaleString("pt-BR")} pessoas na equipe`
      : null,
  ].filter((item): item is string => Boolean(item));
}

export function billingLimitCopy(row: BillingEntitlementMatrixRow) {
  return row.limitValue === null
    ? "Uso incluído"
    : `Até ${row.limitValue.toLocaleString("pt-BR")} por mês`;
}
