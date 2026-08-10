import {
  BadgeCheck,
  Building2,
  Calculator,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  FileText,
  Flame,
  Info,
  Loader2,
  Lock,
  MessageSquare,
  PackagePlus,
  Plus,
  Receipt,
  Share2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import type { BillingCheckoutState } from "./BillingCheckoutPanel";
import { featureLabels, featureValueCopy, money } from "./billingFormat";
import {
  billingPackagePriceLabel,
  billingPlanLimitHighlights,
} from "./BillingPlanCompositionParts";
import type {
  BillingOverview,
  BillingPlan,
  BillingProviderStatus,
  CreateBillingCheckoutInput,
} from "./types";
import { AnimatedCounter } from "../../components/ui/CountUp";
import { BillingCrmPackage } from "./BillingCrmPackage";

export function BillingSignupFlow({
  canManage,
  checkoutState,
  onAddonToggle,
  onCancelZapi,
  onPlanSelect,
  onSubscribe,
  onRequestZapi,
  overview,
  providerStatus,
  selectedAddonIds,
  selectedPlanId,
  selectionSaving = false,
  zapiRequestSaving = false,
}: {
  canManage: boolean;
  checkoutState: BillingCheckoutState;
  onAddonToggle: (addonId: string) => void;
  onCancelZapi: () => void;
  onPlanSelect: (planId: string) => void;
  onSubscribe: (input: CreateBillingCheckoutInput) => Promise<unknown>;
  onRequestZapi: () => void;
  overview: BillingOverview;
  providerStatus: BillingProviderStatus | null;
  selectedAddonIds: readonly string[];
  selectedPlanId: string | null;
  selectionSaving?: boolean;
  zapiRequestSaving?: boolean;
}) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );

  const allActivePlans = overview.plans.filter(
    (plan) => plan.status === "active",
  );
  const nonBasicPlans = allActivePlans.filter(
    (plan) =>
      plan.code !== "basic" &&
      plan.code !== "starter" &&
      !plan.name.toLowerCase().includes("basic") &&
      !plan.name.toLowerCase().includes("básico"),
  );
  const activePlans = nonBasicPlans.length ? nonBasicPlans : allActivePlans;
  const selectedPlan =
    activePlans.find((plan) => plan.id === selectedPlanId) ??
    activePlans[0] ??
    null;

  const crmAddon = overview.addons.find(
    (addon) =>
      addon.status === "active" &&
      addon.code === "crm_core" &&
      (!selectedPlan || addon.catalogVersion === selectedPlan.catalogVersion),
  );
  const zapiAddon = overview.addons.find(
    (addon) =>
      addon.status === "active" &&
      addon.code === "crm_zapi" &&
      (!selectedPlan || addon.catalogVersion === selectedPlan.catalogVersion),
  );
  const activeAddons = overview.addons.filter(
    (addon) =>
      addon.status === "active" &&
      addon.code !== "crm_core" &&
      addon.code !== "crm_zapi" &&
      !addon.code.toLowerCase().includes("public_api") &&
      !addon.name.toLowerCase().includes("public api") &&
      !addon.name.toLowerCase().includes("api pública") &&
      (!selectedPlan || addon.catalogVersion === selectedPlan.catalogVersion),
  );

  const isAnnual = billingCycle === "annual";
  const annualDiscountFactor = isAnnual ? 0.85 : 1.0;

  const rawPlanCents = selectedPlan?.monthlyPriceCents ?? 0;
  const planCents = Math.round(rawPlanCents * annualDiscountFactor);

  const addonTotalCents = selectedAddonIds.reduce((sum, addonId) => {
    const addon = overview.addons.find((item) => item.id === addonId);
    const discountFactor =
      addon?.code === "crm_core" || addon?.code === "crm_zapi"
        ? 1
        : annualDiscountFactor;
    return sum + Math.round((addon?.monthlyPriceCents ?? 0) * discountFactor);
  }, 0);

  const totalCents = planCents + addonTotalCents;

  const providerReady = providerStatus?.configured ?? true;
  const paidSubscription =
    overview.subscription?.status === "active" ||
    overview.subscription?.status === "past_due";
  const busy =
    selectionSaving ||
    checkoutState.kind === "starting" ||
    checkoutState.kind === "started";
  const canSubscribe =
    canManage && providerReady && Boolean(selectedPlan) && !busy;
  const isTrial = overview.subscription?.status === "trialing";

  return (
    <div className="billing-sota-workspace relative space-y-4 pb-36 px-2 md:px-4">
      {/* Visual Mesh Glow Effects */}
      <div
        className="absolute top-0 right-1/4 w-[500px] h-[300px] rounded-full bg-accent-strong/15 blur-[120px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Redesigned Sleek Header Section */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-line/70">
        <div className="flex items-center gap-3">
          {isTrial ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-1 rounded-full bg-warning-soft text-warning-strong border border-warning-subtle">
              <Clock className="size-3.5" aria-hidden="true" /> Teste Gratuito
              em Andamento
            </span>
          ) : paidSubscription ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-1 rounded-full bg-success-soft text-success-strong border border-success-subtle">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />{" "}
              Assinatura Ativa
            </span>
          ) : null}
        </div>

        {/* Annual / Monthly Toggle Switch */}
        <div className="flex items-center gap-1 bg-app-elevated p-1 rounded-2xl border border-line shrink-0">
          <button
            type="button"
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-black transition-all",
              billingCycle === "monthly"
                ? "bg-accent-strong text-accent-strong-foreground"
                : "text-muted hover:text-foreground",
            )}
            onClick={() => setBillingCycle("monthly")}
          >
            Cobrança Mensal
          </button>
          <button
            type="button"
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-black transition-all flex items-center gap-2",
              billingCycle === "annual"
                ? "bg-accent-strong text-accent-strong-foreground"
                : "text-muted hover:text-foreground",
            )}
            onClick={() => setBillingCycle("annual")}
          >
            <span>Plano Anual</span>
            <span className="bg-success-strong text-white text-xs uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full">
              -15% OFF
            </span>
          </button>
        </div>
      </header>

      {/* Main Content Sections */}
      <div className="relative z-10 space-y-6">
        {/* Section 1: Full Icon-Theme Base Plan Cards */}
        <section className="space-y-6 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-accent-strong flex items-center gap-1.5">
              <Crown
                className="size-4 text-warning-strong"
                aria-hidden="true"
              />
              Plano base
            </span>
          </div>

          <div
            aria-label="Planos disponíveis"
            className="grid gap-6 grid-cols-1 md:grid-flow-col md:auto-cols-fr"
            role="radiogroup"
          >
            {activePlans.map((plan, index) => {
              const selected = plan.id === (selectedPlan?.id ?? null);
              const priceCents = Math.round(
                plan.monthlyPriceCents * annualDiscountFactor,
              );
              const includedFeatures = plan.features.filter((f) => f.included);
              const theme = getPlanTheme(plan, index);
              const IconComponent = theme.icon;

              return (
                <button
                  aria-checked={selected}
                  className={cn(
                    "text-left relative group p-7 md:p-8 min-h-[460px] md:min-h-[500px] rounded-3xl transition-all flex flex-col justify-between",
                    selected ? theme.cardSelected : theme.cardDefault,
                    !canManage
                      ? "opacity-75 cursor-not-allowed"
                      : "cursor-pointer",
                  )}
                  disabled={!canManage}
                  key={plan.id}
                  onClick={() => onPlanSelect(plan.id)}
                  role="radio"
                  type="button"
                >
                  {/* Keep decorative art clipped without clipping the recommendation badge. */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none"
                  >
                    <IconComponent
                      aria-hidden="true"
                      className={cn(
                        "absolute -bottom-8 -right-8 size-48 select-none stroke-[1.2] -rotate-12 transition-all duration-300 group-hover:scale-110",
                        theme.iconColor,
                        selected ? "opacity-20" : "opacity-10",
                      )}
                    />
                  </div>

                  {index === 0 ? (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-accent-strong text-accent-strong-foreground text-xs font-black uppercase tracking-widest px-3.5 py-0.5 rounded-full z-10">
                      RECOMENDADO PARA SUA LOJA
                    </span>
                  ) : null}

                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <IconComponent
                          className={cn("size-7 shrink-0", theme.iconColor)}
                          aria-hidden="true"
                        />
                        <strong className="text-xl md:text-2xl font-black text-foreground">
                          {plan.name}
                        </strong>
                      </div>

                      <div
                        className={cn(
                          "size-6.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-transform active:scale-90",
                          selected
                            ? theme.checkBg
                            : "border-line bg-app-surface/80 text-transparent",
                        )}
                      >
                        <Check className="size-3.5 stroke-[3]" />
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
                          {money(priceCents)}
                        </span>
                        <span className="text-xs font-bold text-muted">
                          /mês
                        </span>
                      </div>
                      {isAnnual ? (
                        <span className="inline-block text-xs font-extrabold text-success-strong bg-success-soft px-2.5 py-0.5 rounded-full mt-2">
                          -15% de desconto no plano anual
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-3 text-xs text-muted font-medium pt-5 border-t border-line/40">
                      {billingPlanLimitHighlights(plan).map((limit) => (
                        <div
                          key={limit}
                          className="flex items-start gap-2.5 text-foreground font-bold"
                        >
                          <CheckCircle2
                            className="size-4 text-success-strong shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <span className="leading-snug">{limit}</span>
                        </div>
                      ))}
                      {includedFeatures.slice(0, 4).map((feature) => (
                        <div
                          key={feature.featureKey}
                          className="flex items-start gap-2.5"
                        >
                          <Check
                            className={cn(
                              "size-3.5 shrink-0 mt-0.5",
                              theme.iconColor,
                            )}
                            aria-hidden="true"
                          />
                          <span className="leading-snug">
                            {featureLabels[feature.featureKey]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {crmAddon ? (
          <section className="space-y-6 pt-6 border-t border-line/70">
            <span className="text-xs font-black uppercase tracking-widest text-accent-strong flex items-center gap-1.5">
              <MessageSquare className="size-4" aria-hidden="true" />
              Atendimento comercial
            </span>
            <BillingCrmPackage
              canManage={canManage}
              contract={
                overview.addonContracts?.find(
                  (contract) => contract.addonCode === "crm_zapi",
                ) ?? null
              }
              crmAddon={crmAddon}
              isBusy={zapiRequestSaving}
              isCrmSelected={selectedAddonIds.includes(crmAddon.id)}
              isZapiSelected={
                zapiAddon ? selectedAddonIds.includes(zapiAddon.id) : false
              }
              onCancelZapi={onCancelZapi}
              onRequestZapi={onRequestZapi}
              onToggleCrm={() => onAddonToggle(crmAddon.id)}
              onToggleZapi={() =>
                zapiAddon ? onAddonToggle(zapiAddon.id) : undefined
              }
              subscriptionStatus={overview.subscription?.status ?? null}
              zapiAddon={zapiAddon ?? null}
            />
          </section>
        ) : null}

        {/* Section 2: Full Icon-Theme Card Addons */}
        {activeAddons.length ? (
          <section className="space-y-6 pt-6 border-t border-line/70">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs font-black uppercase tracking-widest text-accent-strong flex items-center gap-1.5">
                <PackagePlus className="size-4" aria-hidden="true" />
                Módulos extras
              </span>
              <span className="text-xs font-black text-foreground bg-app-elevated border border-line px-3.5 py-1.5 rounded-full">
                {selectedAddonIds.length}{" "}
                {selectedAddonIds.length === 1 ? "adicionado" : "adicionados"}
              </span>
            </div>

            <div className="grid gap-6 grid-cols-1 md:grid-flow-col md:auto-cols-fr">
              {activeAddons.map((addon) => {
                const isSelected = selectedAddonIds.includes(addon.id);
                const addonPrice = Math.round(
                  addon.monthlyPriceCents * annualDiscountFactor,
                );
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

                const theme = getAddonTheme(
                  addon.featureKey,
                  addon.code,
                  addon.name,
                );
                const IconComponent = theme.icon;

                return (
                  <button
                    aria-checked={isSelected}
                    className={cn(
                      "text-left relative group p-6 md:p-7 min-h-[270px] rounded-3xl transition-all flex flex-col justify-between gap-6",
                      isSelected ? theme.cardSelected : theme.cardDefault,
                      !canManage
                        ? "opacity-75 cursor-not-allowed"
                        : "cursor-pointer",
                    )}
                    disabled={!canManage}
                    key={addon.id}
                    onClick={() => onAddonToggle(addon.id)}
                    role="checkbox"
                    type="button"
                  >
                    {/* Decorative Background Icon Overlay Container */}
                    <div
                      className="absolute inset-0 rounded-none overflow-hidden pointer-events-none"
                      aria-hidden="true"
                    >
                      <IconComponent
                        aria-hidden="true"
                        className={cn(
                          "absolute -bottom-6 -right-6 size-36 select-none stroke-[1.2] -rotate-12 transition-all duration-300 group-hover:scale-110",
                          theme.iconColor,
                          isSelected ? "opacity-20" : "opacity-10",
                        )}
                      />
                    </div>

                    {theme.recommended ? (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-accent-strong text-accent-strong-foreground text-xs font-black uppercase tracking-widest px-3.5 py-0.5 rounded-full z-20 shadow-sm">
                        {theme.recommended}
                      </span>
                    ) : null}

                    <div>
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <IconComponent
                            className={cn("size-7 shrink-0", theme.iconColor)}
                            aria-hidden="true"
                          />
                          <div>
                            <h4 className="text-lg font-black text-foreground leading-snug">
                              {addon.name}
                            </h4>
                            <span className="text-xs font-semibold text-muted block mt-0.5">
                              {addon.includedInTrial
                                ? "Incluído no teste"
                                : "Módulo adicional"}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Checkmark Box */}
                        <div
                          className={cn(
                            "size-6.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-transform active:scale-90",
                            isSelected
                              ? theme.checkBg
                              : "border-line bg-app-surface/80 text-transparent",
                          )}
                        >
                          <Check
                            className="size-3.5 stroke-[3]"
                            aria-hidden="true"
                          />
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-muted leading-relaxed min-h-[44px]">
                        {featureValueCopy[row.featureKey] ??
                          "Potencialize a gestão e os resultados da sua loja com este módulo adicional."}
                      </p>
                    </div>

                    <div className="flex items-center justify-center pt-4 border-t border-line/40">
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-black text-foreground tracking-tight">
                          {money(addonPrice)}
                        </span>
                        <span className="text-xs font-semibold text-muted">
                          /mês
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>

      {/* SOTA FLAT ALWAYS-VISIBLE BOTTOM BAR ACCOUNTING FOR SIDEBAR SIZE */}
      <aside
        aria-label="Resumo mensal"
        className="billing-bottom-bar bg-app-panel border-t border-line px-6 py-4.5"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8">
          {/* Price & Plan Summary */}
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl text-accent-strong flex items-center justify-center shrink-0">
              <Receipt className="size-6" aria-hidden="true" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-accent-strong">
                  Investimento Total Recorrente
                </span>
                {isAnnual ? (
                  <span className="text-xs font-bold text-success-strong bg-success-soft px-2.5 py-0.5 rounded-full">
                    Plano Anual (-15%)
                  </span>
                ) : null}
              </div>

              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                  <AnimatedCounter value={money(totalCents)} />
                </span>
                <span className="text-xs font-extrabold text-muted">/mês</span>

                <span className="text-xs font-bold text-muted hidden lg:inline border-l border-line pl-3 ml-2">
                  {selectedPlan ? `Plano ${selectedPlan.name}` : "Plano Base"}
                  {selectedAddonIds.length
                    ? ` + ${selectedAddonIds.length} Módulo(s)`
                    : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Action Button & Security */}
          <div className="flex items-center gap-4 shrink-0">
            {!canManage ? (
              <div className="text-xs font-semibold text-muted bg-app-elevated px-4 py-3 rounded-xl border border-line">
                <Building2
                  aria-hidden="true"
                  className="size-4 text-accent-strong inline mr-1.5"
                />
                Gerenciado pela agência
              </div>
            ) : (
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  className="billing-checkout-button w-full md:w-auto flex items-center justify-center gap-2.5 py-4 px-9 rounded-2xl text-sm font-black hover:scale-[1.02] active:scale-[0.98] transition-transform"
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
                      className="size-5 animate-spin"
                    />
                  ) : (
                    <Lock aria-hidden="true" className="size-4" />
                  )}
                  {!providerReady
                    ? "Pagamento indisponível"
                    : busy
                      ? "Redirecionando…"
                      : paidSubscription
                        ? "Atualizar assinatura"
                        : "Continuar para pagamento"}
                </button>
                {!providerReady ? (
                  <p className="text-xs font-semibold text-muted">
                    Nenhuma cobrança foi feita enquanto o pagamento está
                    indisponível.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function getPlanTheme(plan: BillingPlan, index: number) {
  const cd = (plan.code ?? "").toLowerCase();
  const nm = (plan.name ?? "").toLowerCase();

  const isPremium = cd.includes("premium") || nm.includes("premium");
  if (isPremium) {
    return {
      cardDefault:
        "bg-purple-500/10 border-purple-500/30 hover:border-purple-500/60",
      cardSelected:
        "bg-purple-500/25 border-2 border-purple-500 ring-2 ring-purple-500/20",
      checkBg: "bg-purple-500 text-white border-purple-500",
      icon: Sparkles,
      iconColor: "text-purple-500",
    };
  }

  const isGrowth = cd.includes("growth") || nm.includes("growth");
  if (isGrowth) {
    return {
      cardDefault: "bg-cyan-500/10 border-cyan-500/30 hover:border-cyan-500/60",
      cardSelected:
        "bg-cyan-500/25 border-2 border-cyan-500 ring-2 ring-cyan-500/20",
      checkBg: "bg-cyan-500 text-white border-cyan-500",
      icon: Zap,
      iconColor: "text-cyan-500",
    };
  }

  const isPro =
    cd.includes("pro") ||
    cd.includes("estoque") ||
    nm.includes("pro") ||
    nm.includes("escala");
  if (isPro) {
    return {
      cardDefault:
        "bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60",
      cardSelected:
        "bg-amber-500/25 border-2 border-amber-500 ring-2 ring-amber-500/20",
      checkBg: "bg-amber-500 text-white border-amber-500",
      icon: Crown,
      iconColor: "text-amber-500",
    };
  }

  return {
    cardDefault:
      "bg-accent-soft/30 border-accent/30 hover:border-accent-strong/60",
    cardSelected:
      "bg-accent-soft/50 border-2 border-accent-strong ring-2 ring-accent-strong/20",
    checkBg:
      "bg-accent-strong text-accent-strong-foreground border-accent-strong",
    icon: Sparkles,
    iconColor: "text-accent-strong",
  };
}

function getAddonTheme(featureKey: string, code: string, name: string) {
  const fk = featureKey.toLowerCase();
  const cd = code.toLowerCase();
  const nm = name.toLowerCase();

  const isCrm =
    fk === "crm" ||
    cd.includes("crm") ||
    cd.includes("whatsapp") ||
    nm.includes("crm");
  if (isCrm) {
    return {
      badgeBg: "bg-emerald-500 text-white",
      badgeText: "text-emerald-500",
      checkBg: "bg-emerald-500 text-white border-emerald-500",
      icon: MessageSquare,
      iconColor: "text-emerald-500",
      recommended: "⚡ RECOMENDADO PARA SUA LOJA",
      cardDefault:
        "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60",
      cardSelected:
        "bg-emerald-500/25 border-2 border-emerald-500 ring-2 ring-emerald-500/20",
    };
  }

  const isNfe =
    fk === "fiscal" ||
    fk === "nfe" ||
    cd.includes("fiscal") ||
    cd.includes("nfe") ||
    nm.includes("nota fiscal") ||
    nm.includes("nfe") ||
    nm.includes("fiscal");
  if (isNfe) {
    return {
      badgeBg: "bg-rose-500 text-white",
      badgeText: "text-rose-500",
      checkBg: "bg-rose-500 text-white border-rose-500",
      icon: FileText,
      iconColor: "text-rose-500",
      recommended: null,
      cardDefault: "bg-rose-500/10 border-rose-500/30 hover:border-rose-500/60",
      cardSelected:
        "bg-rose-500/25 border-2 border-rose-500 ring-2 ring-rose-500/20",
    };
  }

  const isSimulations =
    fk === "financing" ||
    fk === "simulations" ||
    cd.includes("financing") ||
    cd.includes("simula") ||
    nm.includes("simula") ||
    nm.includes("financiamento");
  if (isSimulations) {
    return {
      badgeBg: "bg-amber-500 text-white",
      badgeText: "text-amber-500",
      checkBg: "bg-amber-500 text-white border-amber-500",
      icon: Calculator,
      iconColor: "text-amber-500",
      recommended: null,
      cardDefault:
        "bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60",
      cardSelected:
        "bg-amber-500/25 border-2 border-amber-500 ring-2 ring-amber-500/20",
    };
  }

  const isMarketplace =
    fk === "marketplace" ||
    cd.includes("marketplace") ||
    nm.includes("marketplace");
  if (isMarketplace) {
    return {
      badgeBg: "bg-cyan-500 text-white",
      badgeText: "text-cyan-500",
      checkBg: "bg-cyan-500 text-white border-cyan-500",
      icon: Share2,
      iconColor: "text-cyan-500",
      recommended: null,
      cardDefault: "bg-cyan-500/10 border-cyan-500/30 hover:border-cyan-500/60",
      cardSelected:
        "bg-cyan-500/25 border-2 border-cyan-500 ring-2 ring-cyan-500/20",
    };
  }

  const isAnalytics =
    fk === "analytics" ||
    cd.includes("analytics") ||
    cd.includes("reports") ||
    nm.includes("análise") ||
    nm.includes("relatório");
  if (isAnalytics) {
    return {
      badgeBg: "bg-purple-500 text-white",
      badgeText: "text-purple-500",
      checkBg: "bg-purple-500 text-white border-purple-500",
      icon: TrendingUp,
      iconColor: "text-purple-500",
      recommended: null,
      cardDefault:
        "bg-purple-500/10 border-purple-500/30 hover:border-purple-500/60",
      cardSelected:
        "bg-purple-500/25 border-2 border-purple-500 ring-2 ring-purple-500/20",
    };
  }

  return {
    badgeBg: "bg-accent-strong text-accent-strong-foreground",
    badgeText: "text-accent-strong",
    checkBg:
      "bg-accent-strong text-accent-strong-foreground border-accent-strong",
    icon: Sparkles,
    iconColor: "text-accent-strong",
    recommended: null,
    cardDefault: "bg-accent-soft/20 border-line hover:border-accent-strong/40",
    cardSelected:
      "bg-accent-soft/40 border-2 border-accent-strong ring-2 ring-accent-strong/20",
  };
}
