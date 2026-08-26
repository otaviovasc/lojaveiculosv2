import {
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  Loader2,
  MessageCircleQuestion,
  ShieldCheck,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { featureLabels, money } from "./billingFormat";
import { isBillingPlanHireTerminal } from "./billingPlanHireState";
import type {
  BillingOverview,
  BillingPlan,
  BillingPlanHire,
  BillingProviderStatus,
} from "./types";

const capabilityCopy: Record<string, readonly string[]> = {
  free: [
    "Construtor completo da vitrine no subdomínio Loja Veículos",
    "Cadastro, publicação e controle de veículos",
    "Captura de interessados com caixa de entrada básica",
  ],
  essencial: [
    "Tudo do Free e domínio próprio",
    "Reservas, vendas e clientes",
    "Financiamento interno e provedor conectado quando verificado",
  ],
  operacao: [
    "Tudo do Essencial e CRM completo",
    "Canais oficiais e Z-API com credenciais próprias",
    "Central de documentos, uploads e modelos",
  ],
  gestao: [
    "Tudo do Operação e gestão fiscal e financeira",
    "Comissões, indicadores, compliance e checklists",
    "Regras de lançamentos financeiros automáticos",
  ],
  escala: [
    "Tudo do Gestão e marketplaces",
    "Public API, webhooks e automação avançada",
    "AI Studio e análise inteligente de revenda",
  ],
};

export function BillingSignupFlow({
  activationInProgress: activationInProgressOverride = false,
  canManage,
  hire,
  onPlanHire,
  onPlanSelect,
  onQuoteRequest,
  overview,
  providerStatus,
  quoteRequesting = false,
  selectedPlanId,
  submitting = false,
}: {
  activationInProgress?: boolean;
  canManage: boolean;
  hire: BillingPlanHire | null;
  onPlanHire: (plan: BillingPlan) => Promise<void>;
  onPlanSelect: (planId: string) => void;
  onQuoteRequest: (plan: BillingPlan) => Promise<void>;
  overview: BillingOverview;
  providerStatus: BillingProviderStatus | null;
  quoteRequesting?: boolean;
  selectedPlanId: string | null;
  submitting?: boolean;
}) {
  const plans = overview.plans
    .filter((plan) => plan.status === "active")
    .sort((a, b) => a.selectionRank - b.selectionRank);
  const selectedPlan =
    plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null;
  const providerReady = Boolean(
    providerStatus?.configured && providerStatus.webhookConfigured,
  );
  const requiresCheckout = selectedPlan?.checkoutMode === "checkout";
  const activationInProgress = Boolean(
    activationInProgressOverride || (hire && !isBillingPlanHireTerminal(hire)),
  );
  const disabled =
    !canManage ||
    !selectedPlan ||
    submitting ||
    quoteRequesting ||
    activationInProgress ||
    (requiresCheckout && !providerReady);

  return (
    <div className="billing-sota-workspace relative space-y-6 px-2 pb-36 md:px-4">
      <header className="border-b border-line/70 pb-4">
        <p className="text-xs font-black uppercase tracking-widest text-accent-strong">
          Catálogo mensal {plans[0]?.catalogVersion ?? "vigente"}
        </p>
        <h2 className="mt-2 text-2xl font-black text-foreground">
          Um plano completo para cada fase da loja
        </h2>
        <p className="mt-1 text-sm text-muted">
          Os recursos são cumulativos. Nenhum adicional é necessário.
        </p>
        <p className="mt-3 flex items-center gap-2 text-xs font-bold text-foreground">
          <ShieldCheck
            aria-hidden="true"
            className="size-4 text-accent-strong"
          />
          Contrato efetivo: {effectivePlanName(overview)} ·{" "}
          {billingPhaseLabel(overview)}
        </p>
      </header>
      <div
        aria-label="Planos disponíveis"
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
        role="radiogroup"
      >
        {plans.map((plan) => {
          const selected = plan.id === selectedPlan?.id;
          const isEscala = plan.checkoutMode === "quote_required";
          return (
            <button
              aria-checked={selected}
              className={cn(
                "flex min-h-[390px] flex-col rounded-3xl border p-5 text-left transition",
                selected
                  ? "border-accent-strong bg-accent-soft/50 ring-2 ring-accent-strong/20"
                  : "border-line bg-app-surface hover:border-accent-strong/60",
              )}
              disabled={
                !canManage ||
                submitting ||
                quoteRequesting ||
                activationInProgress
              }
              key={plan.id}
              onClick={() => onPlanSelect(plan.id)}
              role="radio"
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="text-xl font-black text-foreground">
                    {plan.name}
                  </strong>
                  <p className="mt-2 text-2xl font-black text-foreground">
                    {isEscala
                      ? `A partir de ${money(plan.monthlyPriceCents)}`
                      : plan.monthlyPriceCents === 0
                        ? "R$ 0"
                        : money(plan.monthlyPriceCents)}
                    <span className="text-xs font-bold text-muted">/mês</span>
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border",
                    selected
                      ? "border-accent-strong bg-accent-strong text-accent-strong-foreground"
                      : "border-line",
                  )}
                >
                  {selected ? <Check className="size-4" /> : null}
                </span>
              </div>
              <ul className="mt-6 space-y-3 text-xs font-semibold text-muted">
                {(
                  capabilityCopy[plan.code] ??
                  plan.features
                    .filter((feature) => feature.included)
                    .map((feature) => featureLabels[feature.featureKey])
                ).map((capability) => (
                  <li className="flex gap-2" key={capability}>
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-success-strong"
                    />
                    {capability}
                  </li>
                ))}
              </ul>
              <PlanLimits plan={plan} />
            </button>
          );
        })}
      </div>
      {hire ? <BillingActivationTimeline hire={hire} /> : null}
      <aside
        aria-label="Resumo da contratação"
        className="billing-bottom-bar border-t border-line bg-app-panel px-6 py-4"
      >
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-accent-strong">
              {selectedPlan?.name ?? "Selecione um plano"}
            </span>
            <p className="mt-1 text-sm font-semibold text-muted">
              {requiresCheckout && !providerReady
                ? "Checkout bloqueado até Asaas e webhook estarem configurados. Nenhuma cobrança foi feita."
                : activationInProgress
                  ? `A contratação ${hire?.id} está em processamento. Aguarde a confirmação do servidor.`
                  : selectedPlan?.checkoutMode === "free"
                    ? "O Free é permanente e não expira."
                    : selectedPlan?.checkoutMode === "quote_required"
                      ? "A contratação depende de uma proposta aprovada pelo servidor."
                      : "Acesso pago somente após confirmação do pagamento."}
            </p>
          </div>
          <button
            className="billing-checkout-button flex items-center justify-center gap-2 px-8 py-4 text-sm font-black"
            disabled={disabled}
            onClick={() =>
              selectedPlan
                ? void (selectedPlan.checkoutMode === "quote_required"
                    ? onQuoteRequest(selectedPlan)
                    : onPlanHire(selectedPlan))
                : undefined
            }
            type="button"
          >
            {submitting || quoteRequesting || activationInProgress ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : selectedPlan?.checkoutMode === "quote_required" ? (
              <MessageCircleQuestion aria-hidden="true" className="size-4" />
            ) : selectedPlan?.checkoutMode === "free" ? (
              <ShieldCheck aria-hidden="true" className="size-4" />
            ) : (
              <ExternalLink aria-hidden="true" className="size-4" />
            )}
            {activationInProgress
              ? "Ativação em andamento"
              : selectedPlan?.checkoutMode === "quote_required"
                ? "Solicitar proposta"
                : selectedPlan?.checkoutMode === "free"
                  ? "Usar plano Free"
                  : "Continuar para pagamento"}
          </button>
        </div>
      </aside>
    </div>
  );
}

function PlanLimits({ plan }: { plan: BillingPlan }) {
  const plateLimit = plan.features.find(
    (feature) => feature.featureKey === "plate_lookup",
  )?.limitValue;
  const labels = [
    plan.limits.vehicleLimit == null
      ? "Limite de veículos sob proposta"
      : `${plan.limits.vehicleLimit} veículos`,
    plan.limits.sellerLimit == null
      ? "Limite de usuários sob proposta"
      : `${plan.limits.sellerLimit} usuário${plan.limits.sellerLimit === 1 ? "" : "s"}`,
    plateLimit == null
      ? "Consultas sob proposta"
      : `${plateLimit} consultas de placa/mês`,
  ];
  return (
    <p className="mt-auto border-t border-line/50 pt-5 text-xs font-bold text-foreground">
      {labels.join(" · ")}
    </p>
  );
}

export function BillingActivationTimeline({ hire }: { hire: BillingPlanHire }) {
  const terminalFailure = [
    "cancelled",
    "expired",
    "failed",
    "reconciliation_failed",
  ].includes(hire.status);
  const succeeded = hire.status === "paid_active";
  return (
    <section
      aria-atomic="true"
      aria-live="polite"
      className="rounded-2xl border border-line bg-app-elevated p-5"
      role="status"
    >
      <div className="flex items-start gap-3">
        {succeeded ? (
          <CheckCircle2
            aria-hidden="true"
            className="size-5 text-success-strong"
          />
        ) : terminalFailure ? (
          <CircleAlert
            aria-hidden="true"
            className="size-5 text-warning-strong"
          />
        ) : (
          <Clock3 aria-hidden="true" className="size-5 text-warning-strong" />
        )}
        <div>
          <h3 className="font-black text-foreground">Ativação da assinatura</h3>
          <p className="mt-1 text-sm font-semibold text-muted">
            {activationLabel(hire)}
          </p>
          {hire.failureCode ? (
            <p className="mt-2 text-xs text-muted">
              Código: {hire.failureCode}. Tente novamente ou informe o ID da
              contratação {hire.id} ao suporte.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function activationLabel(hire: BillingPlanHire) {
  const labels: Record<BillingPlanHire["status"], string> = {
    created: "Contratação registrada. Preparando o checkout.",
    checkout_created: "Checkout criado. Aguardando o pagamento.",
    payment_pending: "Pagamento pendente de confirmação.",
    activation_pending: "Pagamento observado. Ativação em processamento.",
    paid_active:
      hire.quotedCents === 0 ? "Plano Free ativo." : "Plano pago ativo.",
    downgrade_scheduled: "Mudança agendada para a próxima renovação.",
    cancelled: "Checkout cancelado. Nenhuma cobrança foi ativada.",
    expired: "Checkout expirado. Inicie uma nova contratação.",
    failed: "A contratação falhou. Tente novamente.",
    reconciliation_failed:
      "A confirmação precisa de conciliação. O acesso Free permanece disponível.",
  };
  return labels[hire.status];
}

function effectivePlanName(overview: BillingOverview) {
  return (
    overview.effectiveContract?.planName ??
    overview.subscription?.plan?.name ??
    "Free"
  );
}

function billingPhaseLabel(overview: BillingOverview) {
  const phase =
    overview.billingPhase ??
    (overview.subscription?.status === "past_due"
      ? "past_due_grace"
      : overview.subscription?.plan?.code === "free" ||
          !overview.subscription?.plan
        ? "free_active"
        : "paid_active");
  const labels = {
    activation_pending: "ativação pendente",
    checkout_created: "checkout criado",
    downgrade_scheduled: "mudança agendada",
    free_active: "permanente",
    paid_active: "pago e ativo",
    past_due_grace: "carência de pagamento",
    payment_pending: "pagamento pendente",
    reconciliation_failed: "conciliação necessária",
  } satisfies Record<NonNullable<BillingOverview["billingPhase"]>, string>;
  return labels[phase];
}
