import { CarFront, LibraryBig, UserRoundPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FeatureSegmentedControl } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { createRuntimeProductCrmApi } from "../crm/runtimeApi";
import type { ProductCrmLead } from "../crm/productCrmTypes";
import { createInventoryApi } from "../inventory/api/apiClient";
import { createInventoryApiOptions } from "../inventory/api/inventoryRuntimeApi";
import { InventoryCatalogSelector } from "../inventory/components/InventoryCatalogSelector";
import { SimulationCrmLeadModal } from "./SimulationCrmLeadModal";
import { SimulationStockVehicleModal } from "./SimulationStockVehicleModal";
import type {
  InventoryCatalogSnapshot,
  InventoryListingSummary,
} from "../inventory/model/types";

export type SimulationSourceData = {
  inventory: readonly InventoryListingSummary[];
  inventoryApi: ReturnType<typeof createInventoryApi> | null;
  inventoryStatus: "error" | "loading" | "ready";
  leads: readonly ProductCrmLead[];
  leadsStatus: "error" | "loading" | "ready";
};

export function SimulationApplicantSource({
  leadId,
  onSelect,
  source,
  onSourceChange,
  sources,
}: {
  leadId: string;
  onSelect: (lead: ProductCrmLead | null) => void;
  source: "existing" | "new";
  onSourceChange: (value: "existing" | "new") => void;
  sources: SimulationSourceData;
}) {
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const selectedLead = useMemo(
    () => sources.leads.find((lead) => lead.id === leadId) ?? null,
    [sources.leads, leadId],
  );

  return (
    <div className="credere-form-source grid gap-4">
      <FeatureSegmentedControl
        ariaLabel="Origem do proponente"
        onChange={onSourceChange}
        options={[
          { icon: Users, label: "Lead existente", value: "existing" },
          { icon: UserRoundPlus, label: "Novo", value: "new" },
        ]}
        value={source}
      />
      {source === "existing" ? (
        <FeatureField label="Lead do CRM">
          {selectedLead ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-3.5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-line/40 bg-app-elevated text-muted">
                    <Users className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-black text-app-text">
                      {selectedLead.buyerName ?? "Lead sem nome"}
                    </h4>
                    <p className="truncate text-xs font-semibold text-muted">
                      {leadLabel(selectedLead)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    className="rounded-xl border border-line/60 bg-app px-3 py-1.5 text-xs font-bold text-app-text transition-colors hover:border-accent-strong hover:bg-accent-soft hover:text-accent-strong"
                    onClick={() => setIsLeadModalOpen(true)}
                    type="button"
                  >
                    Trocar lead
                  </button>
                  <button
                    className="rounded-xl border border-line/60 bg-app px-2.5 py-1.5 text-xs font-bold text-muted transition-colors hover:border-danger/40 hover:text-danger-strong"
                    onClick={() => onSelect(null)}
                    title="Remover seleção"
                    type="button"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-line-strong bg-panel/60 p-4 text-left transition-all hover:border-accent-strong hover:bg-panel"
              onClick={() => setIsLeadModalOpen(true)}
              type="button"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                  <Users className="size-5" />
                </span>
                <div>
                  <strong className="block text-sm font-black text-app-text">
                    Clique para selecionar lead do CRM
                  </strong>
                  <span className="text-xs font-medium text-muted">
                    {sources.leadsStatus === "loading"
                      ? "Carregando leads..."
                      : sources.leads.length > 0
                        ? `${sources.leads.length} leads disponíveis no CRM`
                        : "Nenhum lead disponível"}
                  </span>
                </div>
              </div>
              <span className="rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">
                Abrir leads
              </span>
            </button>
          )}

          {sources.leadsStatus === "error" ? (
            <span className="text-xs font-bold text-danger" role="alert">
              Não foi possível carregar os leads. Você ainda pode preencher um
              novo proponente.
            </span>
          ) : null}

          <SimulationCrmLeadModal
            isOpen={isLeadModalOpen}
            items={sources.leads}
            onClose={() => setIsLeadModalOpen(false)}
            onSelect={onSelect}
            selectedId={leadId || undefined}
            status={sources.leadsStatus}
          />
        </FeatureField>
      ) : null}
    </div>
  );
}

export function SimulationVehicleSource({
  catalog,
  listingId,
  manufactureYear,
  onCatalogChange,
  onManufactureYearChange,
  onSelectListing,
  onSourceChange,
  onYearChange,
  source,
  sources,
  onToast,
}: {
  catalog: InventoryCatalogSnapshot | null;
  listingId: string;
  manufactureYear: string;
  onCatalogChange: (catalog: InventoryCatalogSnapshot | null) => void;
  onManufactureYearChange: (value: string) => void;
  onSelectListing: (listing: InventoryListingSummary | null) => void;
  onSourceChange: (value: "catalog" | "stock") => void;
  onYearChange: (year: number | null) => void;
  source: "catalog" | "stock";
  sources: SimulationSourceData;
  onToast?: (message: string) => void;
}) {
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const selectedItem = useMemo(
    () =>
      sources.inventory.find((item) => item.listing.id === listingId) ?? null,
    [sources.inventory, listingId],
  );

  return (
    <div className="credere-form-source grid gap-4">
      <FeatureSegmentedControl
        ariaLabel="Origem do veículo"
        onChange={onSourceChange}
        options={[
          { icon: CarFront, label: "Estoque", value: "stock" },
          { icon: LibraryBig, label: "Catálogo FIPE", value: "catalog" },
        ]}
        value={source}
      />
      {source === "stock" ? (
        <FeatureField label="Veículo do estoque">
          {selectedItem ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-3.5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-app-elevated border border-line/40">
                    {selectedItem.primaryMediaUrl ? (
                      <img
                        alt={selectedItem.listing.title}
                        className="h-full w-full object-cover"
                        src={selectedItem.primaryMediaUrl}
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted">
                        <CarFront className="size-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-black text-app-text">
                      {selectedItem.listing.title}
                    </h4>
                    <p className="truncate text-xs font-semibold text-muted">
                      {listingLabel(selectedItem)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    className="rounded-xl border border-line/60 bg-app px-3 py-1.5 text-xs font-bold text-app-text transition-colors hover:border-accent-strong hover:bg-accent-soft hover:text-accent-strong"
                    onClick={() => setIsStockModalOpen(true)}
                    type="button"
                  >
                    Trocar veículo
                  </button>
                  <button
                    className="rounded-xl border border-line/60 bg-app px-2.5 py-1.5 text-xs font-bold text-muted transition-colors hover:border-danger/40 hover:text-danger-strong"
                    onClick={() => onSelectListing(null)}
                    title="Remover seleção"
                    type="button"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-line-strong bg-panel/60 p-4 text-left transition-all hover:border-accent-strong hover:bg-panel"
              onClick={() => setIsStockModalOpen(true)}
              type="button"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                  <CarFront className="size-5" />
                </span>
                <div>
                  <strong className="block text-sm font-black text-app-text">
                    Clique para selecionar veículo do estoque
                  </strong>
                  <span className="text-xs font-medium text-muted">
                    {sources.inventoryStatus === "loading"
                      ? "Carregando estoque..."
                      : sources.inventory.length > 0
                        ? `${sources.inventory.length} veículos disponíveis no estoque`
                        : "Nenhum veículo no estoque"}
                  </span>
                </div>
              </div>
              <span className="rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">
                Abrir catálogo
              </span>
            </button>
          )}

          {sources.inventoryStatus === "error" ? (
            <span className="text-xs font-bold text-danger" role="alert">
              Não foi possível carregar o estoque. Use o Catálogo FIPE para
              continuar.
            </span>
          ) : null}

          <SimulationStockVehicleModal
            isOpen={isStockModalOpen}
            items={sources.inventory}
            onClose={() => setIsStockModalOpen(false)}
            onSelect={(item) => {
              onSelectListing(item);
              if (onToast) {
                onToast(
                  `Veículo "${item.listing.title}" selecionado do estoque.`,
                );
              }
            }}
            status={sources.inventoryStatus}
          />
        </FeatureField>
      ) : (
        <InventoryCatalogSelector
          api={sources.inventoryApi}
          catalog={catalog}
          manufactureYear={manufactureYear}
          onCatalogChange={onCatalogChange}
          onManufactureYearChange={onManufactureYearChange}
          onYearChange={onYearChange}
        />
      )}
    </div>
  );
}

export function useSimulationSources(): SimulationSourceData {
  const [state, setState] = useState<SimulationSourceData>({
    inventory: [],
    inventoryApi: null,
    inventoryStatus: "loading",
    leads: [],
    leadsStatus: "loading",
  });
  const crmApi = useMemo(() => createRuntimeProductCrmApi(), []);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([
      createInventoryApiOptions().then((options) => {
        const api = createInventoryApi(options);
        return api
          .listListings({ limit: 100 })
          .then((result) => ({ api, items: result.items }));
      }),
      crmApi.listLeads({ limit: 100 }),
    ]).then(([inventoryResult, leadsResult]) => {
      if (cancelled) return;
      setState({
        inventory:
          inventoryResult.status === "fulfilled"
            ? inventoryResult.value.items.filter(
                (item) => item.listing.status !== "sold_out",
              )
            : [],
        inventoryApi:
          inventoryResult.status === "fulfilled"
            ? inventoryResult.value.api
            : null,
        inventoryStatus:
          inventoryResult.status === "fulfilled" ? "ready" : "error",
        leads: leadsResult.status === "fulfilled" ? leadsResult.value : [],
        leadsStatus: leadsResult.status === "fulfilled" ? "ready" : "error",
      });
    });
    return () => {
      cancelled = true;
    };
  }, [crmApi]);

  return state;
}

export function readLeadDocument(lead: ProductCrmLead) {
  for (const key of ["cpfCnpj", "document", "cpf", "cnpj"]) {
    const value = lead.metadata[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function leadLabel(lead: ProductCrmLead) {
  return [lead.buyerName ?? "Lead sem nome", lead.buyerPhone, lead.vehicleTitle]
    .filter(Boolean)
    .join(" · ");
}

function listingLabel(item: InventoryListingSummary) {
  return [
    item.listing.title,
    item.listing.modelYear,
    item.primaryUnit?.stockNumber
      ? `Estoque ${item.primaryUnit.stockNumber}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
