import { useCallback, useEffect, useMemo, useState } from "react";
import "../../styles/crm-module.css";
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
import { createLeadWithInitialStage } from "./crmLeadCreation";
import { CrmWhatsappInbox } from "./CrmWhatsappInbox";
import {
  crmSurfaceHash,
  readCrmLeadIdFromHash,
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
  const [activeLeadId, setActiveLeadId] = useState<string | null>(() =>
    readInitialLeadId(),
  );
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
  const canLoadPipeline = activeSurface !== "whatsapp";
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
      setActiveLeadId((current) => {
        if (nextLeads.some((lead) => lead.id === current)) return current;
        const leadId = readInitialLeadId();
        return nextLeads.some((lead) => lead.id === leadId) ? leadId : null;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    } finally {
      setIsLoading(false);
    }
  }, [crmApi, filters.search, filters.source, filters.status]);

  useEffect(() => {
    if (!canLoadPipeline) {
      setIsLoading(false);
      return;
    }
    void refreshLeads();
  }, [canLoadPipeline, refreshLeads]);

  useEffect(() => {
    if (routeSurface) setActiveSurface(routeSurface);
  }, [routeSurface]);

  useEffect(() => {
    if (!canLoadPipeline) return undefined;
    let isActive = true;

    void createInventoryApiOptions()
      .then((options) =>
        createInventoryApi(options).listListings({
          limit: 50,
          status: "available",
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
  }, [canLoadPipeline]);

  const createLead = async (input: LeadCreateDraft) => {
    const lead = await createLeadWithInitialStage(crmApi, input);
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

  const moveLeadPipelineStage = async (
    leadId: string,
    pipelineStageId: string,
  ) => {
    const lead = await crmApi.moveLeadPipelineStage(leadId, {
      pipelineStageId,
    });
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

  if (activeSurface === "whatsapp") {
    return <CrmWhatsappInbox productApi={crmApi} />;
  }

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
      onMoveLeadPipelineStage={moveLeadPipelineStage}
      onRefresh={refreshLeads}
      onSelectLead={setActiveLeadId}
      onUpdateLead={updateLeadContact}
      pipelineApi={crmApi}
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

function readInitialLeadId() {
  if (typeof window === "undefined") return null;
  return readCrmLeadIdFromHash(window.location.hash);
}
