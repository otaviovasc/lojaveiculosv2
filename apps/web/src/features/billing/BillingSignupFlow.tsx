import {
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Crown,
  Loader2,
  Lock,
  MessageCircleQuestion,
  Receipt,
  Sparkles,
  Zap,
} from "lucide-react";
import { AnimatedCounter } from "../../components/ui/CountUp";
import { cn } from "../../lib/utils";
import {
  money,
  planCapabilityHighlights,
  planLimitHighlights,
} from "./billingFormat";
import { BillingCurrentPlanSection } from "./BillingCurrentPlanSection";
import { isBillingPlanHireTerminal } from "./billingPlanHireState";
import type {
  BillingOverview,
  BillingPlan,
  BillingPlanHire,
  BillingProviderStatus,
} from "./types";

export function BillingSignupFlow({
  activationInProgress: activationInProgressOverride = false,
  canManage,
  hire,
  onPlanHire,
  onPlanSelect,
  onQuoteRequest,
  overview,
  providerStatus,
  quoteRequested = false,
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
  quoteRequested?: boolean;
  quoteRequesting?: boolean;
  selectedPlanId: string | null;
  submitting?: boolean;
}) {
  const allPlans = overview.plans
    .filter((plan) => plan.status === "active")
    .sort((a, b) => a.selectionRank - b.selectionRank);
  const plans = allPlans.filter((plan) => plan.checkoutMode !== "free");
  const freePlan =
    allPlans.find((plan) => plan.checkoutMode === "free") ?? null;
  const selectedPlan =
    plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null;
  const providerReady = Boolean(
    providerStatus?.configured && providerStatus.webhookConfigured,
  );
  const requiresCheckout = selectedPlan?.checkoutMode === "checkout";
  const currentPlanId =
    overview.effectiveContract?.planId ??
    overview.subscription?.plan?.id ??
    allPlans.find((plan) => plan.code === "free")?.id ??
    null;
  const currentPlan =
    allPlans.find((plan) => plan.id === currentPlanId) ?? null;
  const selectedIsCurrent = selectedPlan?.id === currentPlanId;
  const paidPlanChange = Boolean(
    currentPlan &&
    currentPlan.monthlyPriceCents > 0 &&
    selectedPlan &&
    selectedPlan.id !== currentPlan.id &&
    selectedPlan.checkoutMode !== "quote_required",
  );
  const providerRequired = Boolean(requiresCheckout || paidPlanChange);
  const selectedQuoteRequested = Boolean(
    quoteRequested && selectedPlan?.checkoutMode === "quote_required",
  );
  const activationInProgress = Boolean(
    activationInProgressOverride || (hire && !isBillingPlanHireTerminal(hire)),
  );
  const busy = submitting || quoteRequesting || activationInProgress;
  const disabled =
    !canManage ||
    !selectedPlan ||
    selectedIsCurrent ||
    selectedQuoteRequested ||
    busy ||
    (providerRequired && !providerReady);
  const phasePresentation = billingPhasePresentation(overview);
  const PhaseIcon = phasePresentation.icon;

  return (
    <div className="billing-sota-workspace relative space-y-4 px-2 pb-36 md:px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-1/4 top-0 h-[300px] w-[500px] rounded-full bg-accent-strong/15 blur-[120px]"
      />
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-line/70 pb-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-extrabold",
            phasePresentation.className,
          )}
        >
          <PhaseIcon aria-hidden="true" className="size-3.5" />
          {effectivePlanName(overview)} · {billingPhaseLabel(overview)}
        </span>
        <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-line bg-app-elevated p-1">
          <span className="rounded-md bg-accent-strong px-4 py-1.5 text-xs font-black text-accent-strong-foreground">
            Cobrança mensal
          </span>
        </div>
      </header>

      <div className="relative z-10 space-y-6">
        <section className="space-y-6 pt-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-accent-strong">
              <Crown
                aria-hidden="true"
                className="size-4 text-warning-strong"
              />
              Planos cumulativos · {plans[0]?.catalogVersion ?? "vigente"}
            </span>
          </div>
          <div
            aria-label="Planos disponíveis"
            className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-4"
            role="radiogroup"
          >
            {plans.map((plan, index) => {
              const selected = plan.id === selectedPlan?.id;
              const current = plan.id === currentPlanId;
              const theme = getPlanTheme(plan);
              const Icon = theme.icon;
              const capabilities = planCapabilityHighlights(
                plan,
                previousCatalogPlan(plan, allPlans),
              );
              return (
                <button
                  aria-checked={selected}
                  className={cn(
                    "group relative flex min-h-[460px] flex-col justify-between rounded-3xl p-7 text-left transition-all md:p-8",
                    selected ? theme.cardSelected : theme.cardDefault,
                    !canManage || busy
                      ? "cursor-not-allowed opacity-75"
                      : "cursor-pointer",
                  )}
                  disabled={!canManage || busy}
                  key={plan.id}
                  onClick={() => onPlanSelect(plan.id)}
                  role="radio"
                  type="button"
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
                  >
                    <Icon
                      className={cn(
                        "absolute -bottom-8 -right-8 size-48 -rotate-12 select-none stroke-[1.2] transition-all duration-300 group-hover:scale-110",
                        theme.iconColor,
                        selected ? "opacity-20" : "opacity-10",
                      )}
                    />
                  </div>
                  {current || index === 0 ? (
                    <span className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent-strong px-3.5 py-0.5 text-xs font-black uppercase tracking-widest text-accent-strong-foreground">
                      {current ? "Plano atual" : "Recomendado para sua loja"}
                    </span>
                  ) : null}
                  <div className="relative">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Icon
                          aria-hidden="true"
                          className={cn("size-7 shrink-0", theme.iconColor)}
                        />
                        <strong className="text-xl font-[950] text-foreground md:text-2xl">
                          {plan.name}
                        </strong>
                      </div>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-6.5 shrink-0 items-center justify-center rounded-full border-2 transition-transform active:scale-90",
                          selected
                            ? theme.checkBg
                            : "border-line bg-app-surface/80 text-transparent",
                        )}
                      >
                        <Check className="size-3.5 stroke-[3]" />
                      </span>
                    </div>
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
                          {plan.checkoutMode === "quote_required"
                            ? `A partir de ${money(plan.monthlyPriceCents)}`
                            : money(plan.monthlyPriceCents)}
                        </span>
                        <span className="text-xs font-bold text-muted">
                          /mês
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3 border-t border-line/40 pt-5 text-xs font-medium text-muted">
                      {planLimitHighlights(plan).map((limit) => (
                        <div
                          className="flex items-start gap-2.5 font-bold text-foreground"
                          key={limit}
                        >
                          <CheckCircle2
                            aria-hidden="true"
                            className="mt-0.5 size-4 shrink-0 text-success-strong"
                          />
                          <span className="leading-snug">{limit}</span>
                        </div>
                      ))}
                      {capabilities.map((capability) => (
                        <div
                          className="flex items-start gap-2.5"
                          key={capability}
                        >
                          <Check
                            aria-hidden="true"
                            className={cn(
                              "mt-0.5 size-3.5 shrink-0",
                              theme.iconColor,
                            )}
                          />
                          <span className="leading-snug">{capability}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
        {hire ? <BillingActivationTimeline hire={hire} /> : null}
        <BillingCurrentPlanSection
          freeChangeDisabled={!canManage || busy || !providerReady}
          {...(currentPlan && currentPlan.monthlyPriceCents > 0 && freePlan
            ? { onScheduleFree: () => void onPlanHire(freePlan) }
            : {})}
          overview={overview}
          plan={currentPlan}
        />
      </div>

      <aside
        aria-label="Resumo da contratação"
        className="billing-bottom-bar border-t border-line bg-app-panel px-6 py-4.5"
      >
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 md:flex-row md:items-center md:gap-8">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-accent-strong">
              <Receipt aria-hidden="true" className="size-6" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-accent-strong">
                Investimento total recorrente
              </span>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight text-foreground md:text-3xl">
                  <AnimatedCounter
                    value={
                      selectedPlan?.checkoutMode === "quote_required"
                        ? `A partir de ${money(selectedPlan.monthlyPriceCents)}`
                        : money(selectedPlan?.monthlyPriceCents ?? 0)
                    }
                  />
                </span>
                <span className="text-xs font-extrabold text-muted">/mês</span>
                <span className="ml-2 hidden border-l border-line pl-3 text-xs font-bold text-muted lg:inline">
                  {selectedPlan
                    ? `Plano ${selectedPlan.name}`
                    : "Selecione um plano"}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-muted">
                {checkoutMessage({
                  activationInProgress,
                  hire,
                  providerReady,
                  paidPlanChange,
                  providerRequired,
                  selectedPlan,
                })}
              </p>
            </div>
          </div>
          {!canManage ? (
            <div className="rounded-xl border border-line bg-app-elevated px-4 py-3 text-xs font-semibold text-muted">
              Contratação disponível apenas para gestores autorizados
            </div>
          ) : (
            <button
              className="billing-checkout-button flex w-full items-center justify-center gap-2.5 rounded-2xl px-9 py-4 text-sm font-black transition-transform hover:scale-[1.02] active:scale-[0.98] md:w-auto"
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
              {busy ? (
                <Loader2 aria-hidden="true" className="size-5 animate-spin" />
              ) : selectedPlan?.checkoutMode === "quote_required" ? (
                <MessageCircleQuestion aria-hidden="true" className="size-4" />
              ) : (
                <Lock aria-hidden="true" className="size-4" />
              )}
              {activationInProgress
                ? "Ativação em andamento"
                : selectedIsCurrent
                  ? "Plano atual"
                  : selectedQuoteRequested
                    ? "Proposta já solicitada"
                    : selectedPlan?.checkoutMode === "quote_required"
                      ? "Solicitar proposta"
                      : paidPlanChange
                        ? "Agendar mudança"
                        : "Continuar para pagamento"}
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function checkoutMessage({
  activationInProgress,
  hire,
  paidPlanChange,
  providerReady,
  providerRequired,
  selectedPlan,
}: {
  activationInProgress: boolean;
  hire: BillingPlanHire | null;
  paidPlanChange: boolean;
  providerReady: boolean;
  providerRequired: boolean;
  selectedPlan: BillingPlan | null;
}) {
  if (providerRequired && !providerReady)
    return "Checkout bloqueado até Asaas e webhook estarem configurados. Nenhuma cobrança foi feita.";
  if (activationInProgress)
    return `A contratação ${hire?.id} está em processamento. Aguarde a confirmação do servidor.`;
  if (selectedPlan?.checkoutMode === "quote_required")
    return "A contratação depende de uma proposta aprovada pelo servidor.";
  if (paidPlanChange)
    return `A mudança para ${selectedPlan?.name ?? "o novo plano"} será agendada para a próxima renovação. O plano atual permanece ativo até lá.`;
  return "Acesso pago somente após confirmação do pagamento.";
}

function getPlanTheme(plan: BillingPlan) {
  const identity = `${plan.code} ${plan.name}`.toLowerCase();
  if (/premium|gestao|gestão/.test(identity)) return planThemes.management;
  if (/growth|operacao|operação/.test(identity)) return planThemes.operation;
  if (/pro|escala/.test(identity)) return planThemes.scale;
  return planThemes.base;
}

function previousCatalogPlan(plan: BillingPlan, plans: readonly BillingPlan[]) {
  const index = plans.findIndex((candidate) => candidate.id === plan.id);
  return index > 0 ? (plans[index - 1] ?? null) : null;
}

const planThemes = {
  base: {
    cardDefault: "bg-blue-500/10 border-blue-500/30 hover:border-blue-500/60",
    cardSelected:
      "bg-blue-500/25 border-2 border-blue-500 ring-2 ring-blue-500/20",
    checkBg: "bg-blue-500 text-white border-blue-500",
    icon: Sparkles,
    iconColor: "text-blue-500",
  },
  management: {
    cardDefault:
      "bg-purple-500/10 border-purple-500/30 hover:border-purple-500/60",
    cardSelected:
      "bg-purple-500/25 border-2 border-purple-500 ring-2 ring-purple-500/20",
    checkBg: "bg-purple-500 text-white border-purple-500",
    icon: Sparkles,
    iconColor: "text-purple-500",
  },
  operation: {
    cardDefault: "bg-cyan-500/10 border-cyan-500/30 hover:border-cyan-500/60",
    cardSelected:
      "bg-cyan-500/25 border-2 border-cyan-500 ring-2 ring-cyan-500/20",
    checkBg: "bg-cyan-500 text-white border-cyan-500",
    icon: Zap,
    iconColor: "text-cyan-500",
  },
  scale: {
    cardDefault:
      "bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60",
    cardSelected:
      "bg-amber-500/25 border-2 border-amber-500 ring-2 ring-amber-500/20",
    checkBg: "bg-amber-500 text-white border-amber-500",
    icon: Crown,
    iconColor: "text-amber-500",
  },
} as const;

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
  const labels = {
    activation_pending: "ativação pendente",
    checkout_created: "checkout criado",
    downgrade_scheduled: "mudança agendada",
    free_active: "permanente",
    paid_active: "assinatura ativa",
    past_due_grace: "carência de pagamento",
    payment_pending: "pagamento pendente",
    reconciliation_failed: "conciliação necessária",
  } satisfies Record<NonNullable<BillingOverview["billingPhase"]>, string>;
  return labels[effectiveBillingPhase(overview)];
}

function billingPhasePresentation(overview: BillingOverview) {
  const phase = effectiveBillingPhase(overview);
  if (phase === "free_active" || phase === "paid_active") {
    return {
      className: "border-success-subtle bg-success-soft text-success-strong",
      icon: CheckCircle2,
    };
  }
  if (phase === "reconciliation_failed") {
    return {
      className: "border-warning-subtle bg-warning-soft text-warning-strong",
      icon: CircleAlert,
    };
  }
  return {
    className: "border-warning-subtle bg-warning-soft text-warning-strong",
    icon: Clock3,
  };
}

function effectiveBillingPhase(
  overview: BillingOverview,
): NonNullable<BillingOverview["billingPhase"]> {
  return (
    overview.billingPhase ??
    (overview.subscription?.status === "past_due"
      ? "past_due_grace"
      : overview.subscription?.plan?.code === "free" ||
          !overview.subscription?.plan
        ? "free_active"
        : "paid_active")
  );
}
