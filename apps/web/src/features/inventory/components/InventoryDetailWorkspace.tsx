import { useState } from "react";
import { Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getVehicleColorLabel } from "@lojaveiculosv2/shared";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryListingDetail, InventoryMedia } from "../model/types";
import {
  TechnicalSpecsPanel,
  type TabId,
} from "./InventoryDetailWorkspaceParts";
import { WorkspaceTopBar } from "./WorkspaceTopBar";
import { WorkspaceKPIStrip } from "./WorkspaceKPIStrip";
import { InternalPhotosZone } from "./InternalPhotosZone";
import { EditSpecsDrawer } from "./EditSpecsDrawer";
import { InventoryPhotosWorkspace } from "./InventoryPhotosWorkspace";
import { InventoryDetailFinanceiroTab } from "./InventoryDetailFinanceiroTab";
import { InventoryDetailAnuncioTab } from "./InventoryDetailAnuncioTab";
import { InventoryDetailDocumentosTab } from "./InventoryDetailDocumentosTab";
import { InventoryDetailVendasTab } from "./InventoryDetailVendasTab";
import { InventoryDetailHistoricoTab } from "./InventoryDetailHistoricoTab";
import { InventoryDetailVitrineTab } from "./InventoryDetailVitrineTab";
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

export function InventoryDetailWorkspace({
  api,
  detail: initialDetail,
  onBack,
  onUpdated,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  onBack: () => void;
  onUpdated: (detail: InventoryListingDetail) => void;
}) {
  const [detail, setDetail] = useState(initialDetail);
  const [activeTab, setActiveTab] = useState<TabId>("geral");

  const [isFinancingActive, setIsFinancingActive] = useState(false);
  const [isInsuranceActive, setIsInsuranceActive] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // General spec editor states
  const primaryUnit = detail.units[0] ?? null;
  const listing = detail.listing;

  const [specs, setSpecs] = useState({
    plate: primaryUnit?.plate || listing.plate || "SEM PLACA",
    color: getVehicleColorLabel(primaryUnit?.colorName) || "Não informado",
    km: listing.mileageKm
      ? `${listing.mileageKm.toLocaleString("pt-BR")} km`
      : "Não informado",
    fuel:
      formatFuelType(listing.fuelType) ||
      listing.catalog?.fuel ||
      "Não informado",
    transmission: formatTransmission(listing.transmission),
    bodyType: "Sedan",
    engine: listing.engineDisplacement || "Não informado",
    doors: listing.doors ? `${listing.doors} portas` : "Não informado",
    modality: "Estoque Próprio",
    vin: primaryUnit?.vin || "9BRX4285829471180",
  });

  const [opcionais, setOpcionais] = useState(initialOpcionais);

  const [observacoes, setObservacoes] = useState(initialObservacoes);

  const [notasInternas, setNotasInternas] = useState(
    listing.internalNotes ?? "",
  );

  const [isSpecsOpen, setIsSpecsOpen] = useState(false);

  const [photosList, setPhotosList] = useState(() =>
    detail.media.filter((m) => m.kind === "photo"),
  );
  const internalPhotos = detail.media.filter(
    (m) => m.kind === "document_preview",
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
    showNotification("Ação executada: " + action);
  };

  const openSaleWorkspace = () => {
    const params = new URLSearchParams();
    params.set("listingId", listing.id);
    params.set("listingTitle", listing.title);
    if (listing.priceCents)
      params.set("priceCents", String(listing.priceCents));
    if (primaryUnit?.id) params.set("unitId", primaryUnit.id);
    if (primaryUnit?.plate) params.set("unitLabel", primaryUnit.plate);
    window.location.hash = `/sales?${params.toString()}`;
  };

  const handleMovePhoto = (from: number, to: number) => {
    const newPhotos = [...photosList];
    const item = newPhotos[from];
    if (!item) return;
    newPhotos.splice(from, 1);
    newPhotos.splice(to, 0, item);
    setPhotosList(newPhotos);
    showNotification("Ordem das fotos atualizada!");
  };

  const handleDeletePhoto = (id: string) => {
    setPhotosList((prev) => prev.filter((p) => p.id !== id));
    showNotification("Foto removida!");
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

  const handleAddPhotoMock = () => {
    const newId = "mock-" + Date.now();
    const newPhoto: InventoryMedia = {
      id: newId,
      kind: "photo",
      url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=640",
      altText: "Nova foto",
      createdAt: new Date().toISOString(),
      displayOrder: photosList.length + 1,
      isPublic: true,
      listingId: listing.id,
      storageKey: "mock-" + newId,
      storeId: listing.storeId,
      tenantId: listing.tenantId,
      updatedAt: new Date().toISOString(),
    };
    setPhotosList((prev) => [...prev, newPhoto]);
    showNotification("Foto adicionada à galeria!");
  };

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
        acquisitionPrice={
          listing.priceCents
            ? formatPrice(listing.priceCents * 0.82)
            : "Sob Consulta"
        }
        margin="18%"
        stockTime="12 dias"
        renaveStatus="Entrada Concluída"
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

      <InventoryDetailWorkspaceTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Workspace Panel Area */}
      <div className="min-h-[400px]">
        {activeTab === "geral" && (
          <div className="flex flex-col gap-8 w-full max-w-none">
            {/* Two-Column Section */}
            <div className="grid gap-6 md:grid-cols-12 w-full">
              {/* Left Column: Photo Area */}
              <div className="md:col-span-8 flex flex-col gap-5">
                <div>
                  <h2 className="text-lg font-black text-app-text">
                    Foto de Destaque e Imagens Públicas
                  </h2>
                  <p className="text-xs text-muted font-bold mt-0.5">
                    Essas imagens serão exibidas no portal público de vendas.
                  </p>
                </div>

                <InventoryPhotosWorkspace
                  photos={photosList}
                  onMove={handleMovePhoto}
                  onDelete={handleDeletePhoto}
                  onUpload={handleAddPhotoMock}
                />
              </div>

              {/* Right Column: Specs Panel */}
              <div className="md:col-span-4 flex flex-col gap-4">
                <TechnicalSpecsPanel
                  specs={specs}
                  onEditSpecs={() => setIsSpecsOpen(true)}
                  opcionais={opcionais}
                  onToggleOpcional={handleToggleOpcional}
                  observacoes={observacoes}
                  onToggleObservacao={handleToggleObservacao}
                  notasInternas={notasInternas}
                  onSaveNotasInternas={(notes) => {
                    void handleSaveInternalNotes(notes);
                  }}
                />
              </div>
            </div>

            {/* Below two-column section: Internal Photos */}
            <div className="flex flex-col gap-4 mt-4 w-full">
              <div>
                <h3 className="text-lg font-black text-app-text">
                  Fotos e Registros Internos
                </h3>
                <p className="text-xs text-muted font-bold mt-0.5">
                  Arquivos para controle interno da equipe comercial.
                </p>
              </div>

              <div className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-4 py-3 rounded-2xl flex items-center gap-3">
                <Info className="size-5 shrink-0 animate-pulse text-blue-500" />
                <p className="text-xs font-bold leading-relaxed">
                  <strong>Atenção:</strong> Estas fotos são estritamente para
                  uso interno (avaliações, pequenos reparos, etc.) e{" "}
                  <strong>NÃO</strong> serão publicadas em anúncios ou feeds
                  externos.
                </p>
              </div>

              <InternalPhotosZone internalPhotos={internalPhotos} />
            </div>
          </div>
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

        {activeTab === "vendas" && <InventoryDetailVendasTab />}

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
      setDetail(updated);
      setNotasInternas(updated.listing.internalNotes ?? "");
      onUpdated(updated);
      showNotification("Notas internas atualizadas!");
    } catch {
      showNotification("Não foi possível salvar as notas internas.");
    }
  }
}
