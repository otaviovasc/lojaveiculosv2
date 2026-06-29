import { useState } from "react";
import { Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getVehicleColorLabel } from "@lojaveiculosv2/shared";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryListingDetail } from "../model/types";
import type { TabId } from "./InventoryDetailWorkspaceParts";
import { WorkspaceTopBar } from "./WorkspaceTopBar";
import { WorkspaceKPIStrip } from "./WorkspaceKPIStrip";
import { EditSpecsDrawer } from "./EditSpecsDrawer";
import { InventoryDetailFinanceiroTab } from "./InventoryDetailFinanceiroTab";
import { InventoryDetailAnuncioTab } from "./InventoryDetailAnuncioTab";
import { InventoryDetailDocumentosTab } from "./InventoryDetailDocumentosTab";
import { InventoryDetailHistoricoTab } from "./InventoryDetailHistoricoTab";
import { InventoryDetailVitrineTab } from "./InventoryDetailVitrineTab";
import { InventoryWorkflowPanel } from "./InventoryWorkflowPanel";
import {
  initialOpcionais,
  initialObservacoes,
  formatPrice,
} from "./InventoryDetailWorkspaceMocks";
import {
  InventoryDetailEmptyTab,
  InventoryDetailWorkspaceTabs,
} from "./InventoryDetailWorkspaceTabs";
import {
  formatFuelType,
  formatTransmission,
} from "./InventoryDetailFormatters";
import { InventoryDetailGeneralTab } from "./InventoryDetailGeneralTab";
import { InventoryDetailOverview } from "./InventoryDetailOverview";

export function InventoryDetailWorkspace({
  api,
  detail: initialDetail,
  onBack,
  onUpdated,
  selectedUnitId,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  onBack: () => void;
  onUpdated: (detail: InventoryListingDetail) => void;
  selectedUnitId?: string | null;
}) {
  const [detail, setDetail] = useState(initialDetail);
  const [activeTab, setActiveTab] = useState<TabId>("geral");

  const [isFinancingActive, setIsFinancingActive] = useState(false);
  const [isInsuranceActive, setIsInsuranceActive] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // General spec editor states
  const primaryUnit =
    detail.units.find((unit) => unit.id === selectedUnitId) ??
    detail.units[0] ??
    null;
  const listing = detail.listing;

  const [specs, setSpecs] = useState({
    plate: primaryUnit?.plate || listing.plate || "SEM PLACA",
    color: getVehicleColorLabel(primaryUnit?.colorName) || "Não informado",
    km:
      listing.mileageKm !== null
        ? `${listing.mileageKm.toLocaleString("pt-BR")} km`
        : "Não informado",
    fuel:
      formatFuelType(listing.fuelType) ||
      listing.catalog?.fuel ||
      "Não informado",
    transmission: formatTransmission(listing.transmission),
    bodyType: vehicleTypeLabel(listing.catalog?.vehicleType),
    engine: listing.engineDisplacement || "Não informado",
    doors: listing.doors ? `${listing.doors} portas` : "Não informado",
    modality: primaryUnit?.stockNumber
      ? `Estoque ${primaryUnit.stockNumber}`
      : "Estoque",
    vin: primaryUnit?.vin || "Não informado",
  });

  const [opcionais, setOpcionais] = useState(initialOpcionais);

  const [observacoes, setObservacoes] = useState(initialObservacoes);

  const [notasInternas, setNotasInternas] = useState(
    listing.internalNotes ?? "",
  );

  const [isSpecsOpen, setIsSpecsOpen] = useState(false);

  const primaryUnitId = primaryUnit?.id ?? null;
  const internalPhotos = detail.media.filter(
    (m) =>
      m.kind === "document_preview" &&
      (!primaryUnitId || m.unitId === primaryUnitId),
  );

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAction = (action: string) => {
    if (action === "Vender") {
      openSaleWorkspace();
      return;
    }
    if (action === "Anunciar") {
      setActiveTab("anuncio");
      showNotification("Abrindo configuração do anúncio.");
      return;
    }
    if (action === "Imprimir Ficha") {
      window.print();
      return;
    }
    if (action === "Transferir Loja") {
      setActiveTab("historico");
      showNotification("Revise o histórico antes de transferir a unidade.");
      return;
    }
    showNotification("Ação executada: " + action);
  };

  const openSaleWorkspace = () => {
    setActiveTab("vendas");
    showNotification("Fluxo de reserva e venda aberto.");
  };

  const handleToggleOpcional = (id: string) => {
    setOpcionais((prev) =>
      prev.map((o) => (o.id === id ? { ...o, checked: !o.checked } : o)),
    );
    showNotification("Opcional atualizado!");
  };

  const handleToggleObservacao = (id: string) => {
    setObservacoes((prev) =>
      prev.map((o) => (o.id === id ? { ...o, checked: !o.checked } : o)),
    );
    showNotification("Observação especial atualizada!");
  };

  const handleUpdatedDetail = (updated: InventoryListingDetail) => {
    setDetail(updated);
    onUpdated(updated);
  };

  const totalCosts = detail.costs.reduce(
    (sum, cost) => sum + cost.amountCents,
    0,
  );
  const acquisitionCost = detail.costs
    .filter((cost) => cost.kind === "acquisition")
    .reduce((sum, cost) => sum + cost.amountCents, 0);
  const margin =
    listing.priceCents && acquisitionCost
      ? `${Math.round(((listing.priceCents - acquisitionCost) / listing.priceCents) * 100)}%`
      : "-";

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-4 py-6 text-app-text">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-accent text-inverse font-black px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-accent-strong/20"
          >
            <Info className="size-4 shrink-0" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar Workspace */}
      <WorkspaceTopBar
        title={listing.title}
        plate={specs.plate}
        id={listing.id}
        onBack={onBack}
        onAction={handleAction}
      />

      {/* KPI Strip & Action Pills */}
      <WorkspaceKPIStrip
        salePrice={
          listing.priceCents ? formatPrice(listing.priceCents) : "Sob Consulta"
        }
        acquisitionPrice={totalCosts ? formatPrice(totalCosts) : "Sem custos"}
        margin={margin}
        stockTime={formatStockAge(listing.createdAt)}
        renaveStatus={statusLabel(listing.status)}
        isFinancingActive={isFinancingActive}
        isInsuranceActive={isInsuranceActive}
        onFinancingToggle={() => {
          setIsFinancingActive(!isFinancingActive);
          showNotification(
            isFinancingActive
              ? "Financiamento desvinculado"
              : "Financiamento simulado com sucesso!",
          );
        }}
        onInsuranceToggle={() => {
          setIsInsuranceActive(!isInsuranceActive);
          showNotification(
            isInsuranceActive
              ? "Seguro desvinculado"
              : "Cotação de seguro integrada!",
          );
        }}
      />

      <InventoryDetailOverview
        detail={detail}
        primaryUnit={primaryUnit}
        specs={specs}
      />

      <InventoryDetailWorkspaceTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Workspace Panel Area */}
      <div className="min-h-[400px]">
        {activeTab === "geral" && (
          <InventoryDetailGeneralTab
            api={api}
            detail={detail}
            initialUnitId={primaryUnitId}
            internalPhotos={internalPhotos}
            notasInternas={notasInternas}
            observacoes={observacoes}
            onUpdated={handleUpdatedDetail}
            onSaveNotasInternas={(notes) => {
              void handleSaveInternalNotes(notes);
            }}
            onToggleObservacao={handleToggleObservacao}
            onToggleOpcional={handleToggleOpcional}
            opcionais={opcionais}
            setIsSpecsOpen={setIsSpecsOpen}
            specs={specs}
          />
        )}

        {activeTab === "financeiro" && (
          <InventoryDetailFinanceiroTab
            api={api}
            listingId={listing.id}
            unit={primaryUnit}
          />
        )}

        {activeTab === "anuncio" && <InventoryDetailAnuncioTab />}

        {activeTab === "documentos" && <InventoryDetailDocumentosTab />}

        {activeTab === "vendas" && (
          <InventoryWorkflowPanel
            api={api}
            detail={detail}
            initialUnitId={primaryUnitId}
            onUpdated={handleUpdatedDetail}
          />
        )}

        {activeTab === "historico" && <InventoryDetailHistoricoTab />}

        {activeTab === "vitrine" && <InventoryDetailVitrineTab />}

        <InventoryDetailEmptyTab activeTab={activeTab} />
      </div>

      {/* Drawers */}
      <EditSpecsDrawer
        isOpen={isSpecsOpen}
        onClose={() => setIsSpecsOpen(false)}
        specs={specs}
        onSave={(updatedSpecs) => {
          setSpecs(updatedSpecs);
          setIsSpecsOpen(false);
          showNotification("Especificações técnicas atualizadas!");
        }}
      />
    </div>
  );

  async function handleSaveInternalNotes(notes: string) {
    try {
      const updated = await api.updateListingDetails(listing.id, {
        internalNotes: notes.trim() ? notes.trim() : null,
      });
      handleUpdatedDetail(updated);
      setNotasInternas(updated.listing.internalNotes ?? "");
      showNotification("Notas internas atualizadas!");
    } catch {
      showNotification("Não foi possível salvar as notas internas.");
    }
  }
}

function vehicleTypeLabel(
  vehicleType: "cars" | "motorcycles" | "trucks" | null | undefined,
) {
  if (vehicleType === "motorcycles") return "Moto";
  if (vehicleType === "trucks") return "Caminhao";
  return "Carro";
}

function formatStockAge(createdAt: string) {
  const createdAtMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdAtMs)) return "-";
  const days = Math.max(0, Math.floor((Date.now() - createdAtMs) / 86_400_000));
  if (days === 0) return "Hoje";
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

function statusLabel(status: InventoryListingDetail["listing"]["status"]) {
  const labels: Record<InventoryListingDetail["listing"]["status"], string> = {
    archived: "Arquivado",
    draft: "Rascunho",
    in_preparation: "Preparacao",
    published: "Publicado",
    sold_out: "Vendido",
    unpublished: "Fora da vitrine",
  };
  return labels[status] ?? status;
}
