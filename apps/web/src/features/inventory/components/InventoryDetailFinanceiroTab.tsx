import { useMemo, useState } from "react";
import { getVehicleColorLabel } from "@lojaveiculosv2/shared";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import { FinanceiroCustosSection } from "./FinanceiroCustosSection";
import type { CostItem } from "./FinanceiroCustosSectionModel";
import { FinanceiroCashFlowSection } from "./FinanceiroCashFlowSection";
import { FinanceiroNotasFiscaisSection } from "./FinanceiroNotasFiscaisSection";
import { VehicleAcquisitionCard } from "./VehicleAcquisitionCard";
import type { InventoryApi } from "../api/apiClient";
import type {
  InventoryCostKind,
  InventoryListingDetail,
  InventoryUnit,
} from "../model/types";
import { createDocumentsApi } from "../../documents/apiClient";
import { createDocumentsApiOptions } from "../../documents/runtimeApi";
import { openDocumentDownload } from "../../documents/DocumentsModuleSupport";
import { uploadInventoryFile } from "../model/mediaWorkspaceTypes";
import {
  costToItem,
  costToCashFlowItem,
  summarizeCosts,
  sumCosts,
  sumOrNull,
  formatOptionalBRL,
  formatBRL,
  formatDate,
  formatMileage,
  formatUnitLabel,
} from "./InventoryDetailFinanceiroTabSupport";

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

  const costItems = selectedCosts.map((cost) =>
    costToItem(cost, detail.documents),
  );
  const cashFlowItems = selectedCosts.map(costToCashFlowItem);

  const handleAddCost = async (
    account: string,
    value: number,
    kind: InventoryCostKind,
    file?: File | null,
  ): Promise<boolean> => {
    if (!selectedUnit) {
      setCostMessage("Adicione uma unidade ao veículo antes de lançar custos.");
      return false;
    }

    setIsAddingCost(true);
    setCostMessage(null);
    try {
      let updated = await api.addCost(selectedUnit.id, {
        amountCents: Math.round(value),
        description: account.trim(),
        kind,
      });

      if (file) {
        // Find the new cost to get its ID
        const existingIds = new Set(detail.costs.map((c) => c.id));
        const newCost = updated.costs.find((c) => !existingIds.has(c.id));

        if (newCost) {
          const upload = await api.requestUnitDocumentUpload(selectedUnit.id, {
            file,
            kind: "other",
          });
          await uploadInventoryFile(file, upload);
          updated = await api.attachUnitDocument(selectedUnit.id, {
            fileName: file.name,
            fileSizeBytes: file.size,
            kind: "other",
            mimeType: file.type || "application/octet-stream",
            storageKey: upload.storageKey,
            title: `Recibo Custo: ${newCost.id}`,
          });
        }
      }

      onUpdated(updated);
      setCostMessage(null);
      return true;
    } catch (error) {
      setCostMessage(
        formatApiErrorDisplay(error, "Não foi possível registrar o custo."),
      );
      return false;
    } finally {
      setIsAddingCost(false);
    }
  };

  const handleDownloadReceipt = async (documentId: string) => {
    try {
      const opts = await createDocumentsApiOptions();
      const docsApi = createDocumentsApi(opts);
      const download = await docsApi.downloadDocument(documentId);
      openDocumentDownload(download);
    } catch (error) {
      console.error("Erro ao baixar o comprovante", error);
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
        clearStatus={() => setCostMessage(null)}
        costs={costItems}
        formatBRL={formatBRL}
        isAdding={isAddingCost}
        onAddCost={handleAddCost}
        onDownloadReceipt={(documentId) => {
          void handleDownloadReceipt(documentId);
        }}
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
