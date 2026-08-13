import { CarFront, LibraryBig, UserRoundPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  FeatureSegmentedControl,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { createRuntimeProductCrmApi } from "../crm/runtimeApi";
import type { ProductCrmLead } from "../crm/productCrmTypes";
import { createInventoryApi } from "../inventory/api/apiClient";
import { createInventoryApiOptions } from "../inventory/api/inventoryRuntimeApi";
import { InventoryCatalogSelector } from "../inventory/components/InventoryCatalogSelector";
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
          <FeatureSelect
            ariaLabel="Lead do CRM"
            onChange={(value) =>
              onSelect(sources.leads.find((lead) => lead.id === value) ?? null)
            }
            options={sources.leads.map((lead) => ({
              label: leadLabel(lead),
              value: lead.id,
            }))}
            placeholder={
              sources.leadsStatus === "loading"
                ? "Carregando leads…"
                : sources.leadsStatus === "error"
                  ? "Leads indisponíveis agora"
                  : sources.leads.length
                    ? "Busque pelo nome ou telefone"
                    : "Nenhum lead disponível"
            }
            searchable
            value={leadId || undefined}
          />
          {sources.leadsStatus === "error" ? (
            <span className="text-xs font-bold text-danger" role="alert">
              Não foi possível carregar os leads. Você ainda pode preencher um
              novo proponente.
            </span>
          ) : null}
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
}) {
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
          <FeatureSelect
            ariaLabel="Veículo do estoque"
            onChange={(value) =>
              onSelectListing(
                sources.inventory.find((item) => item.listing.id === value) ??
                  null,
              )
            }
            options={sources.inventory.map((item) => ({
              label: listingLabel(item),
              value: item.listing.id,
            }))}
            placeholder={
              sources.inventoryStatus === "loading"
                ? "Carregando estoque…"
                : sources.inventoryStatus === "error"
                  ? "Estoque indisponível agora"
                  : sources.inventory.length
                    ? "Busque por veículo, placa ou estoque"
                    : "Nenhum veículo disponível"
            }
            searchable
            value={listingId || undefined}
          />
          {sources.inventoryStatus === "error" ? (
            <span className="text-xs font-bold text-danger" role="alert">
              Não foi possível carregar o estoque. Use o Catálogo FIPE para
              continuar.
            </span>
          ) : null}
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
