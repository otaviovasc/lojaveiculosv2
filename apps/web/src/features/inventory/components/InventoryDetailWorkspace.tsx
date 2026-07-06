import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryListingDetail } from "../model/types";
import type { TabId } from "./InventoryDetailWorkspaceParts";
import { WorkspaceTopBar, type WorkspaceTopBarAction } from "./WorkspaceTopBar";
import { WorkspaceKPIStrip } from "./WorkspaceKPIStrip";
import { EditSpecsDrawer } from "./EditSpecsDrawer";
import { InventoryDetailFinanceiroTab } from "./InventoryDetailFinanceiroTab";
import { InventoryDetailAnuncioTab } from "./InventoryDetailAnuncioTab";
import { InventoryDetailDocumentosTab } from "./InventoryDetailDocumentosTab";
import { InventoryDetailHistoricoTab } from "./InventoryDetailHistoricoTab";
import { InventoryDetailVitrineTab } from "./InventoryDetailVitrineTab";
import { buildSalesRouteFromInventoryDetail } from "./InventoryDetailSalesRoute";
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
  buildInitialSpecs,
  calculateMargin,
  formatStockAge,
  statusLabel,
} from "./InventoryDetailFormatters";
import { InventoryDetailGeneralTab } from "./InventoryDetailGeneralTab";
import { InventoryDetailOverview } from "./InventoryDetailOverview";
import {
  buildPublicListingUrl,
  type InventoryDetailStoreLink,
} from "./InventoryDetailPublicRoute";
import { InventoryDetailDeleteDialog } from "./InventoryDetailDeleteDialog";
import { InventoryVehiclePrintSheet } from "./InventoryVehiclePrintSheet";

export function InventoryDetailWorkspace({
  api,
  detail: initialDetail,
  onBack,
  onUpdated,
  selectedUnitId,
  stores = [],
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  onBack: () => void;
  onUpdated: (detail: InventoryListingDetail) => void;
  selectedUnitId?: string | null;
  stores?: readonly InventoryDetailStoreLink[];
}) {
  const [detail, setDetail] = useState(initialDetail);
  const [activeTab, setActiveTab] = useState<TabId>("geral");

  const [isFinancingActive, setIsFinancingActive] = useState(false);
  const [isInsuranceActive, setIsInsuranceActive] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const primaryUnit =
    detail.units.find((unit) => unit.id === selectedUnitId) ??
    detail.units[0] ??
    null;
  const listing = detail.listing;

  const [specs, setSpecs] = useState(buildInitialSpecs(listing, primaryUnit));

  const [opcionais, setOpcionais] = useState(initialOpcionais);

  const [observacoes, setObservacoes] = useState(initialObservacoes);

  const [notasInternas, setNotasInternas] = useState(
    listing.internalNotes ?? "",
  );

  const [isSpecsOpen, setIsSpecsOpen] = useState(false);

  const primaryUnitId = primaryUnit?.id ?? null;
  const publicListingUrl = useMemo(
    () => buildPublicListingUrl(detail, stores),
    [detail, stores],
  );

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAction = (action: WorkspaceTopBarAction) => {
    if (action === "sell") {
      openSaleWorkspace();
      return;
    }
    if (action === "view-public-listing") {
      if (!publicListingUrl) {
        showNotification("Publique o veículo para gerar a URL do anúncio.");
        return;
      }
      window.open(publicListingUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (action === "print") {
      setIsPrintSheetOpen(true);
      return;
    }
    if (action === "transfer") {
      setActiveTab("historico");
      showNotification("Revise o histórico antes de transferir a unidade.");
      return;
    }
    if (action === "delete") {
      setDeleteError(null);
      setIsDeleteDialogOpen(true);
    }
  };

  const openSaleWorkspace = () => {
    window.location.hash = buildSalesRouteFromInventoryDetail(
      detail,
      primaryUnitId,
    );
  };

  const handleTabChange = (tab: TabId) => {
    if (tab === "vendas") {
      openSaleWorkspace();
      return;
    }
    setActiveTab(tab);
  };

  const handleToggleOpcional = (id: string) => {
    setOpcionais((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
    showNotification("Opcional atualizado!");
  };
  const handleToggleObservacao = (id: string) => {
    setObservacoes((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
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
  const margin = calculateMargin(listing.priceCents, acquisitionCost);

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

      <WorkspaceTopBar
        canTransferStores={stores.length > 1}
        title={listing.title}
        plate={specs.plate}
        publicListingUrl={publicListingUrl}
        onBack={onBack}
        onAction={handleAction}
      />

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
        onTabChange={handleTabChange}
      />

      {/* Workspace Panel Area */}
      <div className="min-h-[400px]">
        {activeTab === "geral" && (
          <InventoryDetailGeneralTab
            api={api}
            detail={detail}
            initialUnitId={primaryUnitId}
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
            detail={detail}
            onUpdated={handleUpdatedDetail}
            unit={primaryUnit}
          />
        )}

        {activeTab === "anuncio" && (
          <InventoryDetailAnuncioTab detail={detail} />
        )}

        {activeTab === "documentos" && (
          <InventoryDetailDocumentosTab detail={detail} />
        )}

        {activeTab === "historico" && (
          <InventoryDetailHistoricoTab detail={detail} />
        )}

        {activeTab === "vitrine" && (
          <InventoryDetailVitrineTab
            detail={detail}
            primaryUnit={primaryUnit}
            specs={specs}
          />
        )}

        <InventoryDetailEmptyTab activeTab={activeTab} />
      </div>

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

      {isPrintSheetOpen ? (
        <InventoryVehiclePrintSheet
          detail={detail}
          onClose={() => setIsPrintSheetOpen(false)}
          primaryUnit={primaryUnit}
          specs={specs}
        />
      ) : null}

      <InventoryDetailDeleteDialog
        deleteError={deleteError}
        isDeleting={isDeleting}
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          if (!isDeleting) setIsDeleteDialogOpen(false);
        }}
        onConfirm={() => void handleDeleteListing()}
      />
    </div>
  );

  async function handleDeleteListing() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteListing(listing.id);
      setIsDeleteDialogOpen(false);
      showNotification("Veículo excluído do estoque.");
      onBack();
    } catch {
      setDeleteError("Não foi possível excluir o veículo.");
    } finally {
      setIsDeleting(false);
    }
  }

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
