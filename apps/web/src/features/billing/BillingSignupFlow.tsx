import {
  BadgeCheck,
  Boxes,
  Building2,
  Check,
  ArrowRight,
  Loader2,
  PackagePlus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
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
    <section className="billing-conversion">
      <Card className="billing-conversion-hero">
        <CardContent className="billing-conversion-hero-content">
          <div>
            <span className="billing-section-label">
              <Sparkles aria-hidden="true" /> Assinatura
            </span>
            <h2>Invista no ritmo da sua operação</h2>
            <p>
              Comece com uma base operacional completa. Adicione só o que
              acelera a sua loja hoje — e altere quando o negócio pedir.
            </p>
          </div>
          <div className="billing-conversion-proof">
            <ShieldCheck aria-hidden="true" />
            <span>Pagamento e liberação confirmados pelo provedor</span>
          </div>
        </CardContent>
      </Card>

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

        <Card
          className="billing-price-summary billing-conversion-summary"
          aria-label="Resumo mensal"
        >
          <CardContent className="billing-conversion-summary-content">
            <span className="billing-section-label">Sua escolha</span>
            <h3>Um valor claro. Sem surpresa no checkout.</h3>

            <div className="billing-price-breakdown">
              <BillingPriceLine
                icon={<Boxes className="size-3.5" />}
                label={
                  selectedPlan ? `Plano ${selectedPlan.name}` : "Plano base"
                }
                value={planCents}
              />
              <BillingPriceLine
                icon={<PackagePlus className="size-3.5" />}
                label="Pacotes adicionais"
                value={addonTotalCents}
              />
            </div>

            <div className="billing-price-total-card">
              <div className="billing-price-total-top">
                <span>Total mensal</span>
                <Badge variant="success">Sem fidelidade</Badge>
              </div>
              <div className="billing-price-total-amount">
                <strong>{money(planCents + addonTotalCents)}</strong>
                <small>/mês</small>
              </div>
              <span className="billing-price-total-note">
                {paidSubscription
                  ? "A alteração entra no próximo ciclo."
                  : "Sem taxa de adesão ou multa por cancelamento."}
              </span>
            </div>

            {!canManage ? (
              <p className="billing-signup-managed">
                <Building2 aria-hidden="true" className="size-4" />
                Gerenciado pela agência — {overview.authority.summary}
              </p>
            ) : (
              <div className="billing-checkout-actions">
                <Button
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
                    <Loader2
                      aria-hidden="true"
                      className="size-4 animate-spin"
                    />
                  ) : (
                    <BadgeCheck aria-hidden="true" className="size-4" />
                  )}
                  {!providerReady
                    ? "Pagamento indisponível"
                    : busy
                      ? "Redirecionando…"
                      : paidSubscription
                        ? "Atualizar assinatura"
                        : "Continuar para pagamento"}
                  {!busy ? (
                    <ArrowRight aria-hidden="true" className="size-4" />
                  ) : null}
                </Button>

                {!providerReady ? (
                  <p className="billing-signup-pending">
                    A conexão de pagamento ainda não está pronta. Nenhuma
                    cobrança foi feita.
                  </p>
                ) : null}

                <ul className="billing-guarantee-list">
                  <li>
                    <Check aria-hidden="true" className="size-3.5" />
                    <span>Cancele quando quiser sem multa</span>
                  </li>
                  <li>
                    <ShieldCheck aria-hidden="true" className="size-3.5" />
                    <span>Checkout seguro via Asaas</span>
                  </li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
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
  const tag = planBadgeLabel(plan.code);
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
          <span className="billing-plan-tag-wrap">
            <span>Plano base</span>
            {tag ? (
              <span
                className={`billing-plan-badge ${
                  plan.code === "growth" || plan.code === "pro"
                    ? "is-highlight"
                    : ""
                }`}
              >
                {tag}
              </span>
            ) : null}
          </span>
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

function planBadgeLabel(code: string) {
  if (code === "growth") return "Recomendado";
  if (code === "pro") return "Mais Popular";
  if (code === "estoque") return "Escala";
  if (code === "premium") return "Intermediário";
  return null;
}
