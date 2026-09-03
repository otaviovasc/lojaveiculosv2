import { useMemo, useState } from "react";
import { ClipboardList, DollarSign, Landmark, Wallet } from "lucide-react";
import { getVehicleColorLabel } from "@lojaveiculosv2/shared";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import { FinanceiroCustosSection } from "./FinanceiroCustosSection";
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
import { useOptionalAccountSession } from "../../account/accountSession";
import { readSessionEffectivePermissions } from "../../account/sessionPermissions";
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
  onSimulate,
  onSell,
  onUpdated,
  unit,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  onSimulate?: () => void;
  onSell?: () => void;
  onUpdated: (detail: InventoryListingDetail) => void;
  unit: InventoryUnit | null;
}) {
  const [isAddingCost, setIsAddingCost] = useState(false);
  const [isUpdatingCost, setIsUpdatingCost] = useState(false);
  const [isVoidingCost, setIsVoidingCost] = useState(false);
  const [costMessage, setCostMessage] = useState<string | null>(null);
  const accountSession = useOptionalAccountSession();
  const permissions = accountSession
    ? readSessionEffectivePermissions(accountSession)
    : null;
  const canCreateCost = permissions?.includes("inventory.cost_create") ?? true;
  const canUpdateCost = permissions?.includes("inventory.cost_update") ?? true;
  const canVoidCost = permissions?.includes("inventory.cost_void") ?? true;

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
    costDate: string,
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
        costDate,
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

  const handleUpdateCost = async (
    costId: string,
    account: string,
    value: number,
    kind: InventoryCostKind,
    costDate: string,
  ): Promise<boolean> => {
    if (!selectedUnit) return false;
    setIsUpdatingCost(true);
    setCostMessage(null);
    try {
      const updated = await api.updateCost(selectedUnit.id, costId, {
        amountCents: Math.round(value),
        costDate,
        description: account.trim(),
        kind,
      });
      onUpdated(updated);
      return true;
    } catch (error) {
      setCostMessage(
        formatApiErrorDisplay(error, "Não foi possível corrigir o custo."),
      );
      return false;
    } finally {
      setIsUpdatingCost(false);
    }
  };

  const handleVoidCost = async (
    costId: string,
    reason: string,
  ): Promise<boolean> => {
    if (!selectedUnit) return false;
    setIsVoidingCost(true);
    setCostMessage(null);
    try {
      const updated = await api.voidCost(selectedUnit.id, costId, { reason });
      onUpdated(updated);
      return true;
    } catch (error) {
      setCostMessage(
        formatApiErrorDisplay(error, "Não foi possível estornar o custo."),
      );
      return false;
    } finally {
      setIsVoidingCost(false);
    }
  };

  const handleDownloadReceipt = async (documentId: string) => {
    try {
      const opts = await createDocumentsApiOptions();
      const docsApi = createDocumentsApi(opts);
      const download = await docsApi.downloadDocument(documentId);
      openDocumentDownload(download);
    } catch (error) {
      setCostMessage(
        formatApiErrorDisplay(error, "Não foi possível abrir o comprovante."),
      );
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
            <h3 className="mb-4 flex items-center gap-2 border-b border-line pb-3 text-sm font-black uppercase tracking-wider">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <Wallet className="size-4" />
              </span>
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

          {onSimulate || onSell ? (
            <div className="mt-4 flex items-center gap-2 pt-2 border-t border-line/20 flex-wrap">
              {onSimulate ? (
                <button
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line/40 bg-panel/60 px-3 text-xs font-bold text-muted hover:text-app-text hover:bg-line/15 transition-all cursor-pointer"
                  onClick={onSimulate}
                  type="button"
                >
                  <Landmark className="size-3.5 text-accent" />
                  <span>Simular Financiamento</span>
                </button>
              ) : null}
              {onSell ? (
                <button
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 text-xs font-black text-accent-text hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer"
                  onClick={onSell}
                  type="button"
                >
                  <DollarSign className="size-3.5" />
                  <span>Iniciar Venda</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
          <h3 className="flex items-center gap-2 border-b border-line pb-3 text-sm font-black uppercase tracking-wider">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <ClipboardList className="size-4" />
            </span>
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

          <div className="flex flex-col border-t border-line/60 pt-4">
            <span className="mb-1 block text-xs font-black uppercase tracking-wider text-muted">
              Observações
            </span>
            <div className="divide-y divide-line/50">
              <FinanceiroReadOnlyNote
                label="Notas internas"
                value={
                  listing.internalNotes || "Sem notas internas registradas."
                }
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
      </div>

      <VehicleAcquisitionCard
        api={api}
        listingId={listing.id}
        unit={selectedUnit}
      />

      <FinanceiroCustosSection
        addStatus={costMessage}
        canCreate={canCreateCost}
        canUpdate={canUpdateCost}
        canVoid={canVoidCost}
        clearStatus={() => setCostMessage(null)}
        costs={costItems}
        formatBRL={formatBRL}
        isAdding={isAddingCost}
        isUpdating={isUpdatingCost}
        isVoiding={isVoidingCost}
        onAddCost={handleAddCost}
        onDownloadReceipt={(documentId) => {
          void handleDownloadReceipt(documentId);
        }}
        onUpdateCost={handleUpdateCost}
        onVoidCost={handleVoidCost}
      />

      <FinanceiroNotasFiscaisSection />

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
    <div className="py-2.5 first:pt-0">
      <span className="block text-xs font-black uppercase tracking-wider text-muted">
        {label}
      </span>
      <p className="mt-1 text-xs font-bold leading-relaxed text-app-text">
        {value}
      </p>
    </div>
  );
}
