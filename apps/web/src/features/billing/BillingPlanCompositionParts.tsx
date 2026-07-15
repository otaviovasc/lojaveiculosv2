import { BadgeCheck, PackagePlus, Sparkles } from "lucide-react";
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
  const enabled = selected ?? isEnabled(row.status);
  return (
    <article className={`billing-package-card ${enabled ? "is-active" : ""}`}>
      <div className="billing-package-card-top">
        <span className={enabled ? "is-active" : ""}>
          {enabled ? (
            <BadgeCheck aria-hidden="true" />
          ) : (
            <Sparkles aria-hidden="true" />
          )}
          {enabled
            ? selectionMode
              ? "Na sua escolha"
              : "Na sua assinatura"
            : "Disponível"}
        </span>
        <strong>{priceLabel}</strong>
      </div>
      <div>
        <h4>{label ?? featureLabels[row.featureKey]}</h4>
        <p>{featureValueCopy[row.featureKey]}</p>
      </div>
      <div className="billing-package-card-footer">
        <small>{detail ?? billingLimitCopy(row)}</small>
        <button
          disabled={!canManage}
          onClick={onSelect}
          title={!canManage ? "A agência gerencia este pacote" : undefined}
          type="button"
        >
          {!canManage ? null : enabled ? null : (
            <PackagePlus aria-hidden="true" />
          )}
          {!canManage
            ? "Gerenciado pela agência"
            : !selectionMode
              ? "Ver detalhes"
              : enabled
                ? "Remover da escolha"
                : "Adicionar à escolha"}
        </button>
      </div>
    </article>
  );
}

export function BillingPriceLine({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="billing-price-line">
      <span>{label}</span>
      <strong>{money(value)}</strong>
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
  return line ? `${money(line.unitAmountCents)}/mês` : "Condição sob consulta";
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
