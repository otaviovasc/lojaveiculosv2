import {
  BadgeCheck,
  Building2,
  Check,
  Loader2,
  PackagePlus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { featureLabels, money } from "./billingFormat";
import type { BillingCheckoutState } from "./BillingCheckoutPanel";
import {
  BillingPackageCard,
  BillingPriceLine,
  billingPackagePriceLabel,
  billingPlanLimitHighlights,
} from "./BillingPlanCompositionParts";
import type {
  BillingOverview,
  BillingPlan,
  BillingProviderStatus,
  CreateBillingCheckoutInput,
} from "./types";

export function BillingSignupFlow({
  canManage,
  checkoutState,
  onAddonToggle,
  onPlanSelect,
  onSubscribe,
  overview,
  providerStatus,
  selectedAddonIds,
  selectedPlanId,
  selectionSaving = false,
}: {
  canManage: boolean;
  checkoutState: BillingCheckoutState;
  onAddonToggle: (addonId: string) => void;
  onPlanSelect: (planId: string) => void;
  onSubscribe: (input: CreateBillingCheckoutInput) => Promise<unknown>;
  overview: BillingOverview;
  providerStatus: BillingProviderStatus | null;
  selectedAddonIds: readonly string[];
  selectedPlanId: string | null;
  selectionSaving?: boolean;
}) {
  const activePlans = overview.plans.filter((plan) => plan.status === "active");
  const selectedPlan =
    activePlans.find((plan) => plan.id === selectedPlanId) ?? null;
  const activeAddons = overview.addons.filter(
    (addon) =>
      addon.status === "active" &&
      (!selectedPlan || addon.catalogVersion === selectedPlan.catalogVersion),
  );
  const addonTotalCents = activeAddons
    .filter((addon) => selectedAddonIds.includes(addon.id))
    .reduce((sum, addon) => sum + addon.monthlyPriceCents, 0);
  const planCents = selectedPlan?.monthlyPriceCents ?? 0;
  const paidSubscription =
    overview.subscription?.status === "active" ||
    overview.subscription?.status === "past_due";
  const providerReady = Boolean(
    providerStatus?.configured && providerStatus.webhookConfigured,
  );
  const busy = selectionSaving || checkoutState.kind === "starting";
  const canSubscribe =
    canManage && providerReady && Boolean(selectedPlan) && !busy;

  return (
    <section className="billing-composition">
      <header className="billing-composition-header">
        <div>
          <span className="billing-section-label">
            <Sparkles aria-hidden="true" /> Assinatura
          </span>
          <h2>Escolha seu plano</h2>
          <p>
            Selecione o plano base, adicione os pacotes que fazem sentido e
            conclua a assinatura em um único passo.
          </p>
        </div>
      </header>

      <div className="billing-signup-grid">
        <div className="billing-signup-main">
          {activePlans.length ? (
            <div
              aria-label="Planos disponíveis"
              className="billing-plan-options"
              role="radiogroup"
            >
              {activePlans.map((plan) => (
                <BillingPlanOption
                  canManage={canManage}
                  key={plan.id}
                  plan={plan}
                  selected={plan.id === selectedPlan?.id}
                  onSelect={() => onPlanSelect(plan.id)}
                />
              ))}
            </div>
          ) : (
            <p className="billing-muted">
              Nenhum plano disponível no momento. Tente novamente em instantes.
            </p>
          )}

          {activeAddons.length ? (
            <div className="billing-package-section">
              <div className="billing-package-heading">
                <div>
                  <span className="billing-section-label">
                    <PackagePlus aria-hidden="true" /> Pacotes adicionais
                  </span>
                  <h3>Leve sua operação além</h3>
                  <p>
                    Escolha soluções com impacto direto no atendimento, na
                    escala e na conformidade da sua loja.
                  </p>
                </div>
                <span className="billing-package-count">
                  {selectedAddonIds.length}{" "}
                  {selectedAddonIds.length === 1 ? "escolhido" : "escolhidos"}
                </span>
              </div>

              <div className="billing-package-grid">
                {activeAddons.map((addon) => {
                  const row = overview.entitlementMatrix.find(
                    (candidate) => candidate.featureKey === addon.featureKey,
                  ) ?? {
                    endsAt: null,
                    featureKey: addon.featureKey,
                    includedInPlan: false,
                    limitValue: null,
                    source: null,
                    startsAt: null,
                    status: "inactive" as const,
                  };
                  return (
                    <BillingPackageCard
                      canManage={canManage}
                      detail={
                        addon.includedInTrial
                          ? "Incluído no teste gratuito"
                          : "Fora do teste gratuito"
                      }
                      key={addon.id}
                      label={addon.name}
                      priceLabel={billingPackagePriceLabel(row, overview)}
                      row={row}
                      selected={selectedAddonIds.includes(addon.id)}
                      selectionMode
                      onSelect={() => onAddonToggle(addon.id)}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="billing-price-summary" aria-label="Resumo mensal">
          <span className="billing-section-label">Investimento mensal</span>
          <BillingPriceLine
            label={selectedPlan ? `Plano ${selectedPlan.name}` : "Plano base"}
            value={planCents}
          />
          <BillingPriceLine
            label="Pacotes adicionais"
            value={addonTotalCents}
          />
          <div className="billing-price-total">
            <span>Total</span>
            <strong>{money(planCents + addonTotalCents)}</strong>
            <small>por mês</small>
          </div>
          <p>
            {paidSubscription
              ? "A atualização é aplicada direto na sua assinatura Asaas com a nova composição."
              : "A cobrança é feita na hora, no cartão. Você confere o valor no checkout Asaas antes de concluir."}
          </p>

          {!canManage ? (
            <p className="billing-signup-managed">
              <Building2 aria-hidden="true" className="size-4" />
              Gerenciado pela agência — {overview.authority.summary}
            </p>
          ) : (
            <>
              <button
                className="billing-checkout-button"
                disabled={!canSubscribe}
                onClick={() =>
                  void onSubscribe({
                    billingTypes: ["CREDIT_CARD"],
                    minutesToExpire: 90,
                  })
                }
                type="button"
              >
                {busy ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <BadgeCheck aria-hidden="true" className="size-4" />
                )}
                {!providerReady
                  ? "Pagamento indisponível"
                  : busy
                    ? "Redirecionando…"
                    : paidSubscription
                      ? "Atualizar assinatura"
                      : "Assinar agora"}
              </button>
              {!providerReady ? (
                <p className="billing-signup-pending">
                  Estamos finalizando a conexão segura de cobrança. Nenhuma
                  cobrança foi feita.
                </p>
              ) : null}
              <p className="billing-checkout-secure">
                <ShieldCheck aria-hidden="true" className="size-4" />
                Checkout seguro pelo Asaas. Você confere o valor antes de
                concluir.
              </p>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

function BillingPlanOption({
  canManage,
  onSelect,
  plan,
  selected,
}: {
  canManage: boolean;
  onSelect: () => void;
  plan: BillingPlan;
  selected: boolean;
}) {
  const includedFeatures = plan.features.filter((feature) => feature.included);
  return (
    <button
      aria-checked={selected}
      className={`billing-plan-option ${selected ? "is-selected" : ""}`}
      disabled={!canManage}
      onClick={onSelect}
      role="radio"
      type="button"
    >
      <span className="billing-plan-option-top">
        <span>
          <span>Plano base</span>
          <strong>{plan.name}</strong>
        </span>
        <span
          aria-hidden="true"
          className={`billing-plan-option-check ${selected ? "is-selected" : ""}`}
        >
          {selected ? <Check /> : null}
        </span>
      </span>
      <strong className="billing-plan-option-price">
        {money(plan.monthlyPriceCents)}
        <small>/mês</small>
      </strong>
      <span className="billing-plan-option-features">
        {billingPlanLimitHighlights(plan).map((limit) => (
          <span key={limit}>
            <Check aria-hidden="true" />
            {limit}
          </span>
        ))}
        {includedFeatures.slice(0, 6).map((feature) => (
          <span key={feature.featureKey}>
            <Check aria-hidden="true" />
            {featureLabels[feature.featureKey]}
          </span>
        ))}
      </span>
    </button>
  );
}
