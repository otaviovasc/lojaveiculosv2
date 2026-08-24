import {
  CalendarClock,
  Check,
  CheckCircle2,
  Loader2,
  MessageCircle,
  MessageSquare,
  Plus,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { money } from "./billingFormat";
import { billingCrmSupportUrl } from "./billingCrmSupport";
import type { BillingAddon, BillingAddonContract } from "./types";
import { Button } from "../../components/ui/button";

export function BillingCrmPackage({
  canManage,
  contract,
  crmAddon,
  isBusy,
  isCrmSelected,
  isZapiSelected,
  onCancelZapi,
  onRequestZapi,
  onToggleCrm,
  onToggleZapi,
  subscriptionStatus,
  zapiAddon,
}: {
  canManage: boolean;
  contract: BillingAddonContract | null;
  crmAddon: BillingAddon;
  isBusy: boolean;
  isCrmSelected: boolean;
  isZapiSelected: boolean;
  onCancelZapi: () => void;
  onRequestZapi: () => void;
  onToggleCrm: () => void;
  onToggleZapi: () => void;
  subscriptionStatus:
    "active" | "cancelled" | "expired" | "past_due" | "trialing" | null;
  zapiAddon: BillingAddon | null;
}) {
  const zapiPrice = zapiAddon?.monthlyPriceCents ?? null;
  const crmTotal =
    zapiPrice === null ? null : crmAddon.monthlyPriceCents + zapiPrice;
  const scheduled =
    contract?.status === "pending" || contract?.status === "scheduled";
  const awaitingSetup = contract?.status === "paid_awaiting_setup";
  const active = contract?.status === "active";
  const isInitialCheckout =
    subscriptionStatus === null ||
    subscriptionStatus === "cancelled" ||
    subscriptionStatus === "expired" ||
    subscriptionStatus === "trialing";
  const canRequest =
    subscriptionStatus === "active" &&
    Boolean(zapiAddon) &&
    isCrmSelected &&
    !scheduled &&
    !awaitingSetup &&
    !active;

  const cardClassName = cn(
    "w-full text-left relative group p-6 md:p-7 min-h-[270px] rounded-3xl transition-all flex flex-col justify-between gap-6",
    isCrmSelected
      ? "bg-emerald-500/25 border-2 border-emerald-500 ring-2 ring-emerald-500/20"
      : "bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500/60",
    !canManage && "opacity-75 cursor-not-allowed",
  );

  const cardContent = (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none"
      >
        <MessageSquare className="absolute -bottom-6 -right-6 size-36 select-none stroke-[1.2] -rotate-12 text-emerald-500 opacity-10 transition-all duration-300 group-hover:scale-110" />
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <MessageSquare
              aria-hidden="true"
              className="size-7 shrink-0 text-emerald-500"
            />
            <div>
              <h3 className="text-lg font-[950] text-foreground leading-snug">
                CRM
              </h3>
              <p className="text-xs font-semibold text-muted block mt-0.5">
                WhatsApp Oficial e Instagram incluídos
              </p>
            </div>
          </div>

          <div
            aria-hidden="true"
            className={cn(
              "size-6.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-transform",
              isCrmSelected
                ? "bg-emerald-500 text-white border-emerald-500"
                : "border-line bg-app-surface/80 text-transparent",
            )}
          >
            <Check className="size-3.5 stroke-[3]" />
          </div>
        </div>

        <ul className="space-y-3 text-xs text-muted font-medium pt-5 border-t border-line/40">
          <IncludedItem>Gestão de leads e conversas</IncludedItem>
          <IncludedItem>WhatsApp Oficial incluído</IncludedItem>
          <IncludedItem>Instagram incluído</IncludedItem>
          {crmAddon.limits?.composioToolExecutionsPerBillingMonth != null ? (
            <IncludedItem>
              {crmAddon.limits.composioToolExecutionsPerBillingMonth.toLocaleString(
                "pt-BR",
              )}{" "}
              ações de integração por mês incluídas
            </IncludedItem>
          ) : null}
        </ul>

        <div className="grid gap-1 mt-5 text-xs leading-relaxed text-muted">
          <p>Cobranças de conversas da Meta são pagas diretamente à Meta.</p>
          <p>
            A Loja Veículos não adiciona cobrança automática por excedente neste
            momento.
          </p>
        </div>
      </div>
    </>
  );

  const priceFooter = (
    <div className="relative z-10 flex items-center justify-center pt-4 border-t border-line/40">
      <div className="flex items-baseline gap-1">
        <span className="text-base font-black text-foreground tracking-tight">
          {money(crmAddon.monthlyPriceCents)}
        </span>
        <span className="text-xs font-semibold text-muted">/mês</span>
      </div>
    </div>
  );

  const zapiPanel = isCrmSelected ? (
    <section className="relative z-10 grid gap-3 border-t border-line/40 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <strong className="text-sm font-black text-foreground">
            Z-API adicional
          </strong>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {zapiPrice !== null && crmTotal !== null
              ? `+${money(zapiPrice)}/mês. Com Z-API, o CRM fica em ${money(crmTotal)}/mês.`
              : "Consulte a disponibilidade e o valor atual na assinatura."}
          </p>
        </div>
        {contract ? <ContractStatus contract={contract} /> : null}
      </div>

      <p className="text-xs leading-relaxed text-muted">
        {isInitialCheckout
          ? "A Z-API entra junto na primeira cobrança. Nossa equipe configura a instância depois da confirmação do pagamento."
          : "A solicitação entra no próximo vencimento. Não há cobrança no meio do ciclo, e sua data atual e os outros adicionais continuam iguais."}
      </p>

      {!zapiAddon ? (
        <p className="text-xs font-semibold text-muted" role="status">
          Z-API indisponível no catálogo atual.
        </p>
      ) : awaitingSetup || active ? (
        <SupportAction contract={contract} />
      ) : scheduled ? (
        <Button
          disabled={!canManage || isBusy}
          onClick={onCancelZapi}
          type="button"
          variant="outline"
        >
          {isBusy ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <X aria-hidden="true" className="size-4" />
          )}
          Cancelar solicitação
        </Button>
      ) : isInitialCheckout ? (
        <Button
          aria-pressed={isZapiSelected}
          disabled={!canManage || isBusy}
          onClick={onToggleZapi}
          type="button"
          variant={isZapiSelected ? "secondary" : "default"}
        >
          {isZapiSelected ? (
            <>
              <Check aria-hidden="true" className="size-4" />
              Incluído na primeira cobrança
            </>
          ) : (
            <>
              <Plus aria-hidden="true" className="size-4" />
              Adicionar Z-API à primeira cobrança
            </>
          )}
        </Button>
      ) : subscriptionStatus === "active" ? (
        <Button
          disabled={!canManage || isBusy || !canRequest}
          onClick={onRequestZapi}
          type="button"
        >
          {isBusy ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <CalendarClock aria-hidden="true" className="size-4" />
          )}
          Solicitar para o próximo vencimento
        </Button>
      ) : (
        <p className="text-xs font-semibold text-warning-strong" role="status">
          Regularize a assinatura para solicitar a Z-API.
        </p>
      )}
    </section>
  ) : null;

  if (!isCrmSelected) {
    return (
      <button
        aria-checked={false}
        aria-label="Adicionar CRM à assinatura"
        className={cardClassName}
        disabled={!canManage || isBusy}
        onClick={onToggleCrm}
        role="checkbox"
        type="button"
      >
        {cardContent}
        {priceFooter}
      </button>
    );
  }

  return (
    <article className={cardClassName}>
      {cardContent}
      {zapiPanel}
      {priceFooter}
    </article>
  );
}

function IncludedItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Check aria-hidden="true" className="size-4 text-success-strong" />
      {children}
    </li>
  );
}

function ContractStatus({ contract }: { contract: BillingAddonContract }) {
  const label = readContractLabel(contract);
  return (
    <span className="billing-status-badge is-enabled" role="status">
      {contract.status === "active" ? (
        <CheckCircle2
          aria-hidden="true"
          className="size-3.5 text-success-strong"
        />
      ) : (
        <CalendarClock
          aria-hidden="true"
          className="size-3.5 text-accent-strong"
        />
      )}
      {label}
    </span>
  );
}

function SupportAction({ contract }: { contract: BillingAddonContract }) {
  const code = contract.supportCode;
  return (
    <div className="grid gap-2">
      {code ? (
        <small className="text-xs text-muted">
          Código da solicitação: {code}
        </small>
      ) : null}
      <Button asChild>
        <a href={billingCrmSupportUrl(code)} rel="noreferrer" target="_blank">
          <MessageCircle aria-hidden="true" className="size-4" />
          Falar com o suporte no WhatsApp
        </a>
      </Button>
    </div>
  );
}

function readContractLabel(contract: BillingAddonContract) {
  if (contract.status === "paid_awaiting_setup") {
    return "Contratado — aguardando configuração";
  }
  if (contract.status === "active") return "Ativo";
  if (contract.status === "pending") return "Registrando solicitação";
  if (contract.status === "scheduled") {
    return "Programado para o próximo vencimento";
  }
  return "Solicitação cancelada";
}
