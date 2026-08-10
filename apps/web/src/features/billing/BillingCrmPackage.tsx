import {
  CalendarClock,
  Check,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Plus,
  X,
} from "lucide-react";
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

  return (
    <article className="billing-package-card grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h3 className="text-xl font-black text-foreground">CRM</h3>
          <p className="text-sm font-semibold text-muted">
            WhatsApp Oficial e Instagram incluídos
          </p>
        </div>
        <strong className="text-xl font-black text-foreground">
          {money(crmAddon.monthlyPriceCents)}/mês
        </strong>
      </div>

      <ul className="grid gap-2 text-sm text-foreground">
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

      <div className="grid gap-1 text-xs leading-relaxed text-muted">
        <p>Cobranças de conversas da Meta são pagas diretamente à Meta.</p>
        <p>
          A Loja Veículos não adiciona cobrança automática por excedente neste
          momento.
        </p>
      </div>

      {!isCrmSelected ? (
        <Button
          disabled={!canManage || isBusy}
          onClick={onToggleCrm}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          Adicionar CRM
        </Button>
      ) : (
        <section className="grid gap-3 border-t border-line/50 pt-4">
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
            <p
              className="text-xs font-semibold text-warning-strong"
              role="status"
            >
              Regularize a assinatura para solicitar a Z-API.
            </p>
          )}
        </section>
      )}
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
