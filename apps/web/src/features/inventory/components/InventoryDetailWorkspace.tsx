import { useState } from "react";
import {
  ArrowLeft,
  Printer,
  ChevronRight,
  DollarSign,
  Info,
  Layers,
  MapPin,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryListingDetail } from "../model/types";
import { getInventoryPlate } from "../model/listCatalogModel";
import {
  WorkspaceKPIStrip,
  TechnicalSpecsPanel,
  PublicPhotosZone,
  InternalPhotosZone,
  type TabId,
} from "./InventoryDetailWorkspaceParts";

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
  const [detail] = useState(initialDetail);
  const [activeTab, setActiveTab] = useState<TabId>("geral");

  // States for interactive demo actions
  const [isFinancingActive, setIsFinancingActive] = useState(false);
  const [isInsuranceActive, setIsInsuranceActive] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const primaryUnit = detail.units[0] ?? null;
  const listing = detail.listing;

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAction = (action: string) => {
    showNotification(`Ação executada: ${action}`);
  };

  const formatPrice = (cents: number | null) => {
    if (cents === null) return "R$ 0";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const salePrice = listing.priceCents
    ? formatPrice(listing.priceCents)
    : "Sob Consulta";
  const acquisitionPrice = listing.priceCents
    ? formatPrice(listing.priceCents * 0.82)
    : "Sob Consulta";
  const publicPhotos = detail.media.filter((m) => m.kind === "photo");
  const internalPhotos = detail.media.filter(
    (m) => m.kind === "document_preview",
  );

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-app-elevated border border-line hover:bg-accent-soft hover:text-accent-strong transition-all cursor-pointer"
            title="Voltar ao estoque"
            type="button"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-black truncate">
              {listing.title}
            </h1>
            <p className="text-xs font-bold text-muted flex items-center gap-2 mt-0.5">
              <span className="bg-app-elevated border border-line px-2 py-0.5 rounded uppercase tracking-wider">
                {primaryUnit?.plate || listing.plate || "Sem Placa"}
              </span>
              <span>•</span>
              <span>ID: {listing.id}</span>
            </p>
          </div>
        </div>

        {/* Main Actions Panel */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleAction("Imprimir Ficha")}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-app-elevated border border-line px-4 text-xs font-black text-app-text hover:bg-line/25 transition-all cursor-pointer"
            type="button"
          >
            <Printer className="size-3.5 text-muted" />
            <span>Imprimir</span>
          </button>
          <button
            onClick={() => handleAction("Transferir Loja")}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-app-elevated border border-line px-4 text-xs font-black text-app-text hover:bg-line/25 transition-all cursor-pointer"
            type="button"
          >
            <MapPin className="size-3.5 text-muted" />
            <span>Transferir</span>
          </button>
          <button
            onClick={() => handleAction("Devolução")}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-app-elevated border border-line px-4 text-xs font-black text-app-text hover:bg-line/25 transition-all cursor-pointer"
            type="button"
          >
            <Trash2 className="size-3.5 text-danger" />
            <span>Devolver</span>
          </button>
          <button
            onClick={() => handleAction("Anunciar")}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-app-elevated border border-line px-4 text-xs font-black text-app-text hover:bg-line/25 transition-all cursor-pointer"
            type="button"
          >
            <ExternalLink className="size-3.5 text-violet-500" />
            <span>Anunciar</span>
          </button>
          <button
            onClick={() => handleAction("Vender")}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-4 text-xs font-black text-inverse hover:bg-accent-strong transition-all cursor-pointer"
            type="button"
          >
            <DollarSign className="size-3.5" />
            <span>Vender</span>
          </button>
        </div>
      </div>

      {/* KPI Strip & Action Pills */}
      <WorkspaceKPIStrip
        salePrice={salePrice}
        acquisitionPrice={acquisitionPrice}
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

      {/* Main Tabs Navigation */}
      <div className="border-b border-line overflow-x-auto select-none no-scrollbar">
        <nav className="flex gap-6 min-w-max">
          {(
            [
              "geral",
              "financeiro",
              "anuncio",
              "documentos",
              "vendas",
              "historico",
              "vitrine",
            ] as const
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={
                "pb-4 text-sm font-black transition-all border-b-2 cursor-pointer relative capitalize " +
                (activeTab === tab
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-app-text")
              }
              type="button"
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Workspace Panel Area */}
      <div className="min-h-[400px]">
        {activeTab === "geral" && (
          <div className="flex flex-col gap-8 max-w-5xl mx-auto">
            {/* Two-Column Section */}
            <div className="grid gap-6 md:grid-cols-12">
              {/* Left Column: Photo Area & Description */}
              <div className="md:col-span-7 flex flex-col gap-5">
                <div>
                  <h2 className="text-lg font-black text-app-text">
                    Foto de Destaque e Imagens Públicas
                  </h2>
                  <p className="text-xs text-muted font-bold mt-0.5">
                    Essas imagens serão exibidas no portal público de vendas.
                  </p>
                </div>

                <PublicPhotosZone publicPhotos={publicPhotos} />
              </div>

              {/* Right Column: Details Panel */}
              <div className="md:col-span-5 flex flex-col gap-4">
                <TechnicalSpecsPanel
                  plate={primaryUnit?.plate || listing.plate || "SEM PLACA"}
                  fuel={listing.catalog?.fuel || "Flex"}
                  vin={primaryUnit?.vin || "9BRX4285829471180"}
                />
              </div>
            </div>

            {/* Below two-column section: Internal Photos */}
            <div className="flex flex-col gap-4 mt-4">
              <div>
                <h3 className="text-lg font-black text-app-text">
                  Fotos e Registros Internos
                </h3>
                <p className="text-xs text-muted font-bold mt-0.5">
                  Arquivos para controle interno da equipe comercial.
                </p>
              </div>

              {/* Warning/Info Bar */}
              <div className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-4 py-3 rounded-2xl flex items-center gap-3">
                <Info className="size-5 shrink-0 animate-pulse text-blue-500" />
                <p className="text-xs font-bold leading-relaxed">
                  <strong>Atenção:</strong> Estas fotos são estritamente para
                  uso interno (avaliações, pequenos reparos, etc.) e{" "}
                  <strong>NÃO</strong> serão publicadas em anúncios ou feeds
                  externos.
                </p>
              </div>

              {/* Upload Drop Zone for Internal Photos */}
              <InternalPhotosZone internalPhotos={internalPhotos} />
            </div>
          </div>
        )}

        {activeTab !== "geral" && (
          <div className="flex flex-col items-center justify-center text-center py-20 bg-panel/30 border border-line border-dashed rounded-2xl">
            <Layers className="size-10 text-muted/50 mb-3" />
            <h4 className="text-sm font-black text-app-text capitalize">
              Painel de {activeTab}
            </h4>
            <p className="text-xs font-bold text-muted max-w-sm mt-1">
              Este submódulo está ativo. Use as ferramentas de ação no topo ou
              configure o veículo na aba Geral.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
