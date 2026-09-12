import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { FeaturePageShell } from "../../../components/ui/FeatureLayout";
import "../../../styles/vehicleDetail.css";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryListingDetail } from "../model/types";
import type { TabId } from "./InventoryDetailWorkspaceParts";
import { WorkspaceTopBar, type WorkspaceTopBarAction } from "./WorkspaceTopBar";
import { WorkspaceKPIStrip } from "./WorkspaceKPIStrip";
import { InventoryDetailFinanceiroTab } from "./InventoryDetailFinanceiroTab";
import { InventoryDetailAnuncioTab } from "./InventoryDetailAnuncioTab";
import { InventoryDetailDocumentosTab } from "./InventoryDetailDocumentosTab";
import { InventoryDetailHistoricoTab } from "./InventoryDetailHistoricoTab";
import { InventoryDetailVitrineTab } from "./InventoryDetailVitrineTab";
import {
  buildSaleContextFromInventoryDetail,
  buildSalesRouteFromInventoryDetail,
} from "./InventoryDetailSalesRoute";
import { formatPrice } from "./InventoryDetailWorkspaceMocks";
import { LeadFinancingSimulationModal } from "../../crm/LeadFinancingSimulationModal";
import { LeadSaleModal } from "../../crm/LeadSaleModal";
import type { SimulationPrefill } from "../../simulations/SimulationForm";
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
import { useOptionalAccountSession } from "../../account/accountSession";
import { readSessionEffectivePermissions } from "../../account/sessionPermissions";

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
  const accountSession = useOptionalAccountSession();
  const canManagePublicSite = accountSession
    ? readSessionEffectivePermissions(accountSession).includes(
        "store_public_site.manage",
      )
    : true;
  const [detail, setDetail] = useState(initialDetail);
  const [activeTab, setActiveTab] = useState<TabId>("geral");
  const [isEditRequested, setIsEditRequested] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);

  const primaryUnit =
    detail.units.find((unit) => unit.id === selectedUnitId) ??
    detail.units[0] ??
    null;
  const listing = detail.listing;

  const specs = useMemo(
    () => buildInitialSpecs(listing, primaryUnit),
    [listing, primaryUnit],
  );

  const [notasInternas, setNotasInternas] = useState(
    listing.internalNotes ?? "",
  );

  const primaryUnitId = primaryUnit?.id ?? null;
  const publicListingUrl = useMemo(
    () => buildPublicListingUrl(detail, stores),
    [detail, stores],
  );

  const simulationPrefill: SimulationPrefill = useMemo(
    () => ({
      listingId: listing.id,
      vehiclePlate: specs.plate !== "-" ? specs.plate : undefined,
      vehiclePriceCents: listing.priceCents ?? undefined,
      vehicleTitle: listing.title,
    }),
    [listing.id, listing.priceCents, listing.title, specs.plate],
  );

  const saleContext = useMemo(
    () => buildSaleContextFromInventoryDetail(detail, primaryUnitId),
    [detail, primaryUnitId],
  );

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAction = (action: WorkspaceTopBarAction) => {
    if (action === "simulate") {
      setIsSimulationModalOpen(true);
      return;
    }
    if (action === "sell") {
      setIsSaleModalOpen(true);
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

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
  };

  const handleUpdatedDetail = (updated: InventoryListingDetail) => {
    setDetail(updated);
    setNotasInternas(updated.listing.internalNotes ?? "");
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
    <FeaturePageShell
      className="vehicle-detail-shell"
      mainClassName="text-app-text"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-accent text-accent-foreground font-black px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-accent-strong/20"
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
          listing.priceCents !== null
            ? formatPrice(listing.priceCents)
            : "Sob Consulta"
        }
        acquisitionPrice={totalCosts ? formatPrice(totalCosts) : "Sem custos"}
        margin={margin}
        stockTime={formatStockAge(listing.createdAt)}
        renaveStatus={statusLabel(listing.status)}
      />

      <InventoryDetailOverview
        detail={detail}
        onEditVehicle={() => {
          setActiveTab("geral");
          setIsEditRequested(true);
        }}
        onSell={() => setIsSaleModalOpen(true)}
        onSimulate={() => setIsSimulationModalOpen(true)}
        primaryUnit={primaryUnit}
        specs={specs}
      />

      <InventoryDetailWorkspaceTabs
        activeTab={activeTab}
        showVitrine={canManagePublicSite}
        onTabChange={handleTabChange}
      />

      {/* Workspace Panel Area */}
      <div className="min-h-[400px]">
        {activeTab === "geral" && (
          <InventoryDetailGeneralTab
            api={api}
            detail={detail}
            isEditRequested={isEditRequested}
            initialUnitId={primaryUnitId}
            notasInternas={notasInternas}
            onUpdated={handleUpdatedDetail}
            onSaveNotasInternas={(notes) => {
              void handleSaveInternalNotes(notes);
            }}
            onEditSaved={() =>
              showNotification("Veículo atualizado com sucesso!")
            }
            onEditRequestHandled={() => setIsEditRequested(false)}
            specs={specs}
          />
        )}

        {activeTab === "financeiro" && (
          <InventoryDetailFinanceiroTab
            api={api}
            detail={detail}
            onSell={() => setIsSaleModalOpen(true)}
            onSimulate={() => setIsSimulationModalOpen(true)}
            onUpdated={handleUpdatedDetail}
            unit={primaryUnit}
          />
        )}

        {activeTab === "anuncio" && (
          <InventoryDetailAnuncioTab
            api={api}
            detail={detail}
            onUpdated={handleUpdatedDetail}
            publicListingUrl={publicListingUrl}
          />
        )}

        {activeTab === "documentos" && (
          <InventoryDetailDocumentosTab
            api={api}
            detail={detail}
            onUpdated={handleUpdatedDetail}
            unit={primaryUnit}
          />
        )}

        {activeTab === "historico" && (
          <InventoryDetailHistoricoTab
            api={api}
            detail={detail}
            onUpdated={handleUpdatedDetail}
          />
        )}

        {activeTab === "vitrine" && canManagePublicSite && (
          <InventoryDetailVitrineTab
            detail={detail}
            primaryUnit={primaryUnit}
            specs={specs}
          />
        )}

        <InventoryDetailEmptyTab activeTab={activeTab} />
      </div>

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

      {isSimulationModalOpen && (
        <LeadFinancingSimulationModal
          onClose={() => setIsSimulationModalOpen(false)}
          prefill={simulationPrefill}
          title={`Simulação de Financiamento · ${listing.title}`}
        />
      )}

      {isSaleModalOpen && (
        <LeadSaleModal
          context={saleContext}
          onClose={() => setIsSaleModalOpen(false)}
          title={`Nova Venda · ${listing.title}`}
        />
      )}
    </FeaturePageShell>
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
