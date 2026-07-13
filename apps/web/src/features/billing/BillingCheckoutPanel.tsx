import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useState, type ReactNode } from "react";
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
}: {
  checkoutState: BillingCheckoutState;
  onCheckout: (input: CreateBillingCheckoutInput) => Promise<unknown>;
  overview: BillingOverview;
  providerStatus: BillingProviderStatus | null;
}) {
  const [paymentMethod, setPaymentMethod] = useState<"CREDIT_CARD" | "PIX">(
    "CREDIT_CARD",
  );
  const activePlans = overview.plans.filter((plan) => plan.status === "active");
  const currentPlan = overview.subscription?.plan ?? activePlans[0] ?? null;
  const selectedPlan = currentPlan ?? activePlans[0] ?? null;
  const canCheckout =
    Boolean(selectedPlan) &&
    Boolean(providerStatus?.configured && providerStatus.webhookConfigured) &&
    overview.chargePreview.totalCents > 0 &&
    paymentMethod === "CREDIT_CARD" &&
    checkoutState.kind !== "starting";
  const providerReady = Boolean(
    providerStatus?.configured && providerStatus.webhookConfigured,
  );

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
          <div>
            <span>Forma de pagamento</span>
            <div className="billing-methods" role="group">
              <MethodToggle
                active={paymentMethod === "CREDIT_CARD"}
                description="Assinatura recorrente"
                icon={<CreditCard aria-hidden="true" className="size-4" />}
                label="Cartao"
                onToggle={() => setPaymentMethod("CREDIT_CARD")}
              />
              <MethodToggle
                active={paymentMethod === "PIX"}
                description="Avulso em breve"
                icon={<Zap aria-hidden="true" className="size-4" />}
                label="Pix"
                onToggle={() => setPaymentMethod("PIX")}
              />
            </div>
          </div>
          <div className="billing-checkout-readiness">
            <span>Checkout</span>
            <strong>
              {providerReady ? "Pronto para contratar" : "Disponível em breve"}
            </strong>
            {!providerReady ? (
              <p>Estamos finalizando a conexão segura de cobrança.</p>
            ) : null}
            {paymentMethod === "PIX" ? (
              <p>
                Assinatura recorrente via Asaas Checkout esta liberada por
                cartao. Pix sera tratado como cobranca avulsa.
              </p>
            ) : null}
          </div>
          <div className="billing-checkout-total">
            <span>Total mensal</span>
            <strong>{money(overview.chargePreview.totalCents)}/mes</strong>
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
            Ativar meu plano
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

function MethodToggle({
  active,
  description,
  icon,
  label,
  onToggle,
}: {
  active: boolean;
  description: string;
  icon: ReactNode;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={active ? "billing-method-active" : ""}
      onClick={onToggle}
      type="button"
    >
      {icon}
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
    </button>
  );
}
