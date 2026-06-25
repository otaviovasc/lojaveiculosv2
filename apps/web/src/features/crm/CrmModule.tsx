import { useCallback, useEffect, useMemo, useState } from "react";
import { createInventoryApi } from "../inventory/api/apiClient";
import { createInventoryApiOptions } from "../inventory/api/inventoryRuntimeApi";
import type { ProductCrmApi } from "./productCrmApi";
import { CrmPipelineView } from "./CrmPipelineView";
import {
  createNoteActivityInput,
  createTaskActivityInput,
  filterLeads,
  type CrmViewMode,
  type LeadContactPatch,
  type LeadCreateDraft,
  type LeadFilters,
} from "./crmPipelineModels";
import { createRuntimeProductCrmApi } from "./runtimeApi";
import type {
  CreateProductCrmActivityInput,
  CrmLeadStatus,
  ProductCrmLead,
} from "./productCrmTypes";
import type {
  LeadActivitiesById,
  LeadVehicleOption,
} from "./CrmPipelineViewTypes";
import {
  createLeadVehicleOption,
  listAllMatchingLeads,
  loadActivitiesByLeadId,
} from "./crmModuleData";
import { CrmWhatsappInbox } from "./CrmWhatsappInbox";
import { CrmSurfaceTabs } from "./CrmSurfaceTabs";
import {
  crmSurfaceHash,
  readCrmSurfaceFromHash,
  type CrmSurface,
} from "./crmRouteState";

export function CrmModule({
  api,
  routeSurface,
}: {
  api?: ProductCrmApi;
  routeSurface?: CrmSurface;
}) {
  const [activeSurface, setActiveSurface] = useState<CrmSurface>(
    () => routeSurface ?? readInitialSurface(),
  );
  const crmApi = useMemo(() => api ?? createRuntimeProductCrmApi(), [api]);
  const [activitiesByLeadId, setActivitiesByLeadId] =
    useState<LeadActivitiesById>({});
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<LeadFilters>({
    search: "",
    source: "all",
    status: "all",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<ProductCrmLead[]>([]);
  const [vehicleOptions, setVehicleOptions] = useState<LeadVehicleOption[]>([]);
  const [viewMode, setViewMode] = useState<CrmViewMode>("kanban");
  const activeActivities = activeLeadId
    ? (activitiesByLeadId[activeLeadId] ?? [])
    : [];
  const statActivities = Object.values(activitiesByLeadId).flat();

  const refreshLeads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const nextLeads = await listAllMatchingLeads(crmApi, {
        limit: 100,
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.source !== "all" ? { source: filters.source } : {}),
        ...(filters.status !== "all" ? { status: filters.status } : {}),
      });
      const nextActivities = await loadActivitiesByLeadId(crmApi, nextLeads);
      setLeads(nextLeads);
      setActivitiesByLeadId(nextActivities);
      setActiveLeadId((current) =>
        nextLeads.some((lead) => lead.id === current) ? current : null,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    } finally {
      setIsLoading(false);
    }
  }, [crmApi, filters.search, filters.source, filters.status]);

  useEffect(() => {
    void refreshLeads();
  }, [refreshLeads]);

  useEffect(() => {
    if (routeSurface) setActiveSurface(routeSurface);
  }, [routeSurface]);

  useEffect(() => {
    let isActive = true;

    void createInventoryApiOptions()
      .then((options) =>
        createInventoryApi(options).listListings({
          limit: 50,
          status: "published",
        }),
      )
      .then((result) => {
        if (isActive) {
          setVehicleOptions(result.items.map(createLeadVehicleOption));
        }
      })
      .catch(() => {
        if (isActive) setVehicleOptions([]);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const createLead = async (input: LeadCreateDraft) => {
    const lead = await crmApi.createLead({
      ...(input.buyerEmail !== undefined
        ? { buyerEmail: input.buyerEmail }
        : {}),
      ...(input.buyerName !== undefined ? { buyerName: input.buyerName } : {}),
      ...(input.buyerPhone !== undefined
        ? { buyerPhone: input.buyerPhone }
        : {}),
      ...(input.listingId !== undefined ? { listingId: input.listingId } : {}),
      source: input.source,
    });
    setLeads((current) => [lead, ...current]);
    setActiveLeadId(lead.id);

    if (input.initialNote) {
      await createActivity(lead.id, createNoteActivityInput(input.initialNote));
    }
    if (input.taskDueAt && input.taskTitle) {
      await createActivity(
        lead.id,
        createTaskActivityInput(input.taskTitle, input.taskDueAt),
      );
    }
  };

  const updateLeadStatus = async (leadId: string, status: CrmLeadStatus) => {
    const lead = await crmApi.updateLead(leadId, { status });
    setLeads((current) =>
      current.map((item) => (item.id === lead.id ? lead : item)),
    );
  };

  const updateLeadContact = async (leadId: string, input: LeadContactPatch) => {
    const lead = await crmApi.updateLead(leadId, input);
    setLeads((current) =>
      current.map((item) => (item.id === lead.id ? lead : item)),
    );
  };

  const createActivity = async (
    leadId: string,
    input: CreateProductCrmActivityInput,
  ) => {
    const activity = await crmApi.createActivity(leadId, input);
    setActivitiesByLeadId((current) => ({
      ...current,
      [leadId]: [activity, ...(current[leadId] ?? [])],
    }));
    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId
          ? { ...lead, lastInteractionAt: activity.occurredAt }
          : lead,
      ),
    );
  };

  const changeSurface = (surface: CrmSurface) => {
    setActiveSurface(surface);
    if (typeof window !== "undefined") {
      window.location.hash = crmSurfaceHash(surface);
    }
  };

  return (
    <CrmPipelineView
      activities={activeActivities}
      activeLeadId={activeLeadId}
      allActivities={statActivities}
      error={error}
      filters={filters}
      isLoading={isLoading}
      leads={leads}
      onChangeFilters={setFilters}
      onChangeViewMode={setViewMode}
      onCreateActivity={createActivity}
      onCreateLead={createLead}
      onRefresh={refreshLeads}
      onSelectLead={setActiveLeadId}
      onUpdateLead={updateLeadContact}
      onUpdateStatus={updateLeadStatus}
      vehicleOptions={vehicleOptions}
      viewLeads={filterLeads(leads, filters)}
      viewMode={viewMode}
    />
  );
}

function readInitialSurface(): CrmSurface {
  if (typeof window === "undefined") return "whatsapp";
  return readCrmSurfaceFromHash(window.location.hash);
}
