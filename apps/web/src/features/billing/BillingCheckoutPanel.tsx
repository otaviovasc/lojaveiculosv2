import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import type {
  BillingOverview,
  BillingProviderStatus,
  CreateBillingCheckoutInput,
} from "./types";
import { featureLabels, money } from "./billingFormat";

export type BillingCheckoutState =
  { kind: "idle" } | { kind: "starting" } | { kind: "started" };

export function BillingCheckoutPanel({
  checkoutState,
  onCheckout,
  overview,
  providerStatus,
  selectedAddonIds = [],
  selectedPlanId,
}: {
  checkoutState: BillingCheckoutState;
  onCheckout: (input: CreateBillingCheckoutInput) => Promise<unknown>;
  overview: BillingOverview;
  providerStatus: BillingProviderStatus | null;
  selectedAddonIds?: readonly string[];
  selectedPlanId?: string | null;
}) {
  const activePlans = overview.plans.filter((plan) => plan.status === "active");
  const controlledSelection = selectedPlanId !== undefined;
  const selectedPlan =
    activePlans.find((plan) => plan.id === selectedPlanId) ??
    overview.subscription?.plan ??
    (!controlledSelection ? activePlans[0] : null) ??
    null;
  const selectedAddons = overview.addons.filter((addon) =>
    selectedAddonIds.includes(addon.id),
  );
  const selectedTotalCents =
    (selectedPlan?.monthlyPriceCents ?? 0) +
    selectedAddons.reduce((sum, addon) => sum + addon.monthlyPriceCents, 0);
  const providerReady = Boolean(
    providerStatus?.configured && providerStatus.webhookConfigured,
  );
  const canCheckout =
    Boolean(selectedPlan) &&
    providerReady &&
    selectedTotalCents > 0 &&
    checkoutState.kind !== "starting";

  return (
    <section className="billing-checkout-panel">
      <header className="billing-checkout-header">
        <div>
          <span className="billing-status-dot">
            <span aria-hidden="true" className={providerReady ? "is-on" : ""} />
            {providerReady ? "Sistema online" : "Sistema pendente"}
          </span>
          <h2>Comece com uma operação pronta para vender</h2>
          <p>
            Ative o plano base e centralize estoque, atendimento e gestão desde
            o primeiro dia.
          </p>
        </div>
      </header>

      <div className="billing-checkout-grid">
        {selectedPlan ? (
          <article className="billing-plan-card billing-plan-card-selected">
            <div className="billing-plan-card-top">
              <span>Plano base</span>
              <strong>{money(selectedPlan.monthlyPriceCents)}/mes</strong>
            </div>
            <div>
              <h3>{selectedPlan.name}</h3>
              <p>
                A estrutura essencial para sua equipe ganhar ritmo sem montar a
                operação com ferramentas separadas.
              </p>
            </div>
            <ul>
              {selectedPlan.features
                .filter((feature) => feature.included)
                .slice(0, 5)
                .map((feature) => (
                  <li key={feature.featureKey}>
                    <CheckCircle2 aria-hidden="true" className="size-4" />
                    {featureLabels[feature.featureKey]}
                  </li>
                ))}
            </ul>
          </article>
        ) : null}

        <div className="billing-checkout-box">
          <div className="billing-checkout-readiness">
            <span>Forma de pagamento</span>
            <strong>
              <CreditCard aria-hidden="true" className="size-4" /> Cartão —
              assinatura recorrente
            </strong>
          </div>
          <div className="billing-checkout-readiness">
            <span>Checkout</span>
            <strong>
              {providerReady ? "Pronto para contratar" : "Disponível em breve"}
            </strong>
            {!providerReady ? (
              <p>Estamos finalizando a conexão segura de cobrança.</p>
            ) : null}
          </div>
          <div className="billing-checkout-total">
            <span>Primeira cobrança mensal</span>
            <strong>{money(selectedTotalCents)}/mes</strong>
          </div>
          <button
            className="billing-checkout-button"
            disabled={!canCheckout}
            onClick={() =>
              void onCheckout({
                billingTypes: ["CREDIT_CARD"],
                minutesToExpire: 90,
              })
            }
            type="button"
          >
            {checkoutState.kind === "starting" ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <ExternalLink aria-hidden="true" className="size-4" />
            )}
            Ir para pagamento Asaas
          </button>
          <p className="billing-checkout-secure">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Checkout seguro pelo Asaas. Você confere o valor antes de concluir.
          </p>
        </div>
      </div>
    </section>
  );
}
