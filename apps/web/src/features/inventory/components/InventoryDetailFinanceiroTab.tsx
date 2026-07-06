import { useMemo, useState } from "react";
import { getVehicleColorLabel } from "@lojaveiculosv2/shared";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import { FinanceiroCustosSection } from "./FinanceiroCustosSection";
import { costKindLabel, type CostItem } from "./FinanceiroCustosSection";
import { FinanceiroCashFlowSection } from "./FinanceiroCashFlowSection";
import { FinanceiroNotasFiscaisSection } from "./FinanceiroNotasFiscaisSection";
import { VehicleAcquisitionCard } from "./VehicleAcquisitionCard";
import type { InventoryApi } from "../api/apiClient";
import type {
  InventoryCostKind,
  InventoryListingDetail,
  InventoryUnit,
} from "../model/types";
import type { InventoryCost } from "../model/operationTypes";
import type { TransactionItem } from "./FinanceiroCashFlowSection";

export function InventoryDetailFinanceiroTab({
  api,
  detail,
  onUpdated,
  unit,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  onUpdated: (detail: InventoryListingDetail) => void;
  unit: InventoryUnit | null;
}) {
  const [isAddingCost, setIsAddingCost] = useState(false);
  const [costMessage, setCostMessage] = useState<string | null>(null);

  const listing = detail.listing;
  const selectedUnit = unit ?? detail.units[0] ?? null;
  const selectedCosts = useMemo(
    () =>
      selectedUnit
        ? detail.costs.filter((cost) => cost.unitId === selectedUnit.id)
        : detail.costs,
    [detail.costs, selectedUnit],
  );

  const acquisitionCosts = selectedCosts.filter(
    (cost) => cost.kind === "acquisition",
  );
  const acquisitionCents = sumOrNull(acquisitionCosts);
  const expenseCents = sumCosts(
    selectedCosts.filter((cost) => cost.kind !== "acquisition"),
  );
  const expectedResultCents =
    listing.priceCents !== null && acquisitionCents !== null
      ? listing.priceCents - acquisitionCents - expenseCents
      : null;
  const marginPercent =
    listing.priceCents && expectedResultCents !== null
      ? (expectedResultCents / listing.priceCents) * 100
      : null;

  const costItems = selectedCosts.map(costToItem);
  const cashFlowItems = selectedCosts.map(costToCashFlowItem);

  const handleAddCost = async (
    account: string,
    value: number,
    kind: InventoryCostKind,
  ) => {
    if (!selectedUnit) {
      setCostMessage("Adicione uma unidade ao veículo antes de lançar custos.");
      return;
    }

    setIsAddingCost(true);
    setCostMessage(null);
    try {
      const updated = await api.addCost(selectedUnit.id, {
        amountCents: Math.round(value),
        description: account.trim(),
        kind,
      });
      onUpdated(updated);
      setCostMessage("Custo registrado no veículo.");
    } catch (error) {
      setCostMessage(
        formatApiErrorDisplay(error, "Não foi possível registrar o custo."),
      );
    } finally {
      setIsAddingCost(false);
    }
  };

  return (
    <section
      aria-label="Financeiro do veículo"
      className="flex w-full max-w-none flex-col gap-8 text-app-text"
    >
      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col justify-between rounded-2xl border border-line bg-panel p-5">
          <div>
            <h3 className="mb-4 border-b border-line pb-3 text-sm font-black uppercase tracking-wider">
              Resumo Financeiro
            </h3>
            <div className="flex flex-col gap-3">
              {[
                {
                  label: "Valor de Entrada",
                  value: formatOptionalBRL(acquisitionCents),
                },
                {
                  label: "Preço anunciado",
                  value: formatOptionalBRL(listing.priceCents),
                },
                { label: "Valor Mínimo", value: "Não informado" },
                { label: "Despesas Loja", value: formatBRL(expenseCents) },
              ].map((row) => (
                <div
                  className="flex items-center justify-between border-b border-line/30 pb-2.5 text-xs font-bold"
                  key={row.label}
                >
                  <span className="text-muted">{row.label}</span>
                  <span className="text-app-text font-black">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-1.5 rounded-xl border border-accent-soft/20 bg-accent-soft/30 p-4">
            <span className="text-xs font-black uppercase tracking-wider text-muted">
              Resultado Esperado
            </span>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-lg font-black text-accent-strong">
                {formatOptionalBRL(expectedResultCents)}
              </span>
              <span className="text-xs font-black text-muted">
                {marginPercent !== null
                  ? `${marginPercent.toFixed(2)}%`
                  : "Sem aquisição"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
          <h3 className="border-b border-line pb-3 text-sm font-black uppercase tracking-wider">
            Dados de Entrada
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs font-bold">
            {[
              {
                label: "Entrada no estoque",
                value: formatDate(selectedUnit?.createdAt ?? listing.createdAt),
              },
              {
                label: "Quilometragem",
                value: formatMileage(listing.mileageKm),
              },
              { label: "Unidade", value: formatUnitLabel(selectedUnit) },
              {
                label: "Cor",
                value:
                  getVehicleColorLabel(selectedUnit?.colorName) ||
                  "Não informado",
              },
            ].map((row) => (
              <div key={row.label}>
                <span className="block text-xs uppercase tracking-wider text-muted">
                  {row.label}
                </span>
                <span className="text-app-text">{row.value}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-line/60 pt-4">
            <span className="mb-1 block text-xs font-black uppercase tracking-wider text-muted">
              Observações
            </span>
            <FinanceiroReadOnlyNote
              label="Notas internas"
              value={listing.internalNotes || "Sem notas internas registradas."}
            />
            <FinanceiroReadOnlyNote
              label="Descrição do anúncio"
              value={
                listing.description || "Sem descrição comercial registrada."
              }
            />
            <FinanceiroReadOnlyNote
              label="Custos registrados"
              value={summarizeCosts(selectedCosts)}
            />
          </div>
        </div>
      </div>

      <VehicleAcquisitionCard
        api={api}
        listingId={listing.id}
        unit={selectedUnit}
      />

      <FinanceiroCustosSection
        addStatus={costMessage}
        costs={costItems}
        formatBRL={formatBRL}
        isAdding={isAddingCost}
        onAddCost={(account, value, kind) =>
          void handleAddCost(account, value, kind)
        }
      />

      <FinanceiroNotasFiscaisSection formatBRL={formatBRL} />

      <FinanceiroCashFlowSection formatBRL={formatBRL} items={cashFlowItems} />
    </section>
  );
}

function FinanceiroReadOnlyNote({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-panel/60 p-3">
      <span className="block border-b border-line/40 pb-1.5 text-xs font-black uppercase tracking-wider text-primary">
        {label}
      </span>
      <p className="mt-2 text-xs font-bold leading-relaxed text-app-text">
        {value}
      </p>
    </div>
  );
}

function costToItem(cost: InventoryCost): CostItem {
  return {
    account: cost.description || costKindLabel(cost.kind),
    date: formatDate(cost.costDate),
    id: cost.id,
    kind: cost.kind,
    kindLabel: costKindLabel(cost.kind),
    value: cost.amountCents,
  };
}

function costToCashFlowItem(cost: InventoryCost): TransactionItem {
  return {
    date: formatDate(cost.costDate),
    description: cost.description || `Custo: ${costKindLabel(cost.kind)}`,
    id: cost.id,
    origin: costKindLabel(cost.kind),
    status: "Registrado",
    value: -cost.amountCents,
  };
}

function summarizeCosts(costs: readonly InventoryCost[]) {
  if (!costs.length) return "Sem custos registrados para esta unidade.";
  return costs
    .map(
      (cost) => `${costKindLabel(cost.kind)}: ${formatBRL(cost.amountCents)}`,
    )
    .join(" | ");
}

function sumCosts(costs: readonly InventoryCost[]) {
  return costs.reduce((sum, cost) => sum + cost.amountCents, 0);
}

function sumOrNull(costs: readonly InventoryCost[]) {
  return costs.length ? sumCosts(costs) : null;
}

function formatOptionalBRL(value: number | null) {
  return value === null ? "Não informado" : formatBRL(value);
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(cents / 100);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function formatMileage(value: number | null) {
  return value === null
    ? "Não informado"
    : `${value.toLocaleString("pt-BR")} km`;
}

function formatUnitLabel(unit: InventoryUnit | null) {
  return unit?.stockNumber || unit?.plate || unit?.vin || "Não informado";
}
