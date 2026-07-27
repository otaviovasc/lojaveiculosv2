import { RefreshCw } from "lucide-react";
import {
  FeatureActionButton,
  FeatureSection,
} from "../../components/ui/FeatureLayout";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import type { CredereSimulation, CredereSimulationCondition } from "./types";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const REFRESHABLE_STATUSES = new Set([
  "pending",
  "processing",
  "submitted",
  "requested",
]);

export function isProcessingStatus(status: string) {
  return REFRESHABLE_STATUSES.has(status);
}

export function SimulationResults({
  isPolling,
  isRefreshing,
  onRefresh,
  simulation,
}: {
  isPolling: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  simulation: CredereSimulation;
}) {
  const refreshable = isProcessingStatus(simulation.status);

  return (
    <FeatureSection
      actions={
        refreshable ? (
          <FeatureActionButton
            disabled={isRefreshing}
            icon={RefreshCw}
            isBusy={isRefreshing}
            label="Atualizar status"
            onClick={onRefresh}
            title="Consultar o provedor novamente"
          />
        ) : undefined
      }
      description="Status exibidos são os retornados pelo provedor e pelos bancos, sem garantia de aprovação."
      title="Resultado da simulação"
    >
      <div className="mt-4 grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FeatureStatusBadge tone={statusTone(simulation.status)}>
            {simulation.status}
          </FeatureStatusBadge>
          {simulation.createdAt ? (
            <span className="text-xs font-bold text-muted">
              Criada em {formatDateTime(simulation.createdAt)}
            </span>
          ) : null}
          {simulation.providerRequestId ? (
            <span className="text-xs font-bold text-muted">
              Protocolo do provedor: {simulation.providerRequestId}
            </span>
          ) : null}
        </div>

        {isPolling ? (
          <p className="text-xs font-semibold text-muted" role="status">
            Atualizando automaticamente a cada 5 segundos.
          </p>
        ) : null}

        {simulation.reason ? (
          <p className="text-xs font-semibold text-muted">
            {simulation.reason}
          </p>
        ) : null}

        {simulation.conditions.length === 0 ? (
          <p className="text-sm font-semibold text-muted">
            O provedor ainda não retornou condições para esta simulação.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-xs">
              <thead>
                <tr className="border-b border-line/60 text-muted">
                  <th className="py-2 pr-3 font-bold">Banco</th>
                  <th className="py-2 pr-3 font-bold">Status</th>
                  <th className="py-2 pr-3 font-bold">Parcelas</th>
                  <th className="py-2 pr-3 font-bold">Total</th>
                  <th className="py-2 font-bold">Observação</th>
                </tr>
              </thead>
              <tbody>
                {simulation.conditions.map((condition, index) => (
                  <ConditionRow
                    condition={condition}
                    key={`${condition.bankCode ?? "bank"}-${index}`}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </FeatureSection>
  );
}

function ConditionRow({
  condition,
}: {
  condition: CredereSimulationCondition;
}) {
  return (
    <tr className="border-b border-line/40 last:border-0">
      <td className="py-2 pr-3 font-bold text-app-text">
        {condition.bankName ?? condition.bankCode ?? "—"}
      </td>
      <td className="py-2 pr-3">
        <FeatureStatusBadge size="dense" tone={statusTone(condition.status)}>
          {condition.status}
        </FeatureStatusBadge>
      </td>
      <td className="py-2 pr-3 font-semibold text-app-text">
        {condition.installments != null ? `${condition.installments}x` : "—"}
      </td>
      <td className="py-2 pr-3 font-semibold text-app-text">
        {formatCents(condition.totalAmountCents)}
      </td>
      <td className="py-2 font-semibold text-muted">
        {condition.summary ?? condition.reason ?? "—"}
      </td>
    </tr>
  );
}

function statusTone(status: string) {
  switch (status) {
    case "available":
      return "success" as const;
    case "failed":
    case "rejected":
      return "danger" as const;
    case "pending":
    case "processing":
    case "submitted":
    case "requested":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

function formatCents(cents: number | null) {
  return cents == null ? "—" : brlFormatter.format(cents / 100);
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
