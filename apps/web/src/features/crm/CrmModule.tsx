import { useEffect, useMemo, useState } from "react";
import "../../styles/crm-module.css";
import { createInventoryApi } from "../inventory/api/apiClient";
import { createInventoryApiOptions } from "../inventory/api/inventoryRuntimeApi";
import type { ProductCrmApi } from "./productCrmApi";
import { CrmPipelineView } from "./CrmPipelineView";
import {
  createNoteActivityInput,
  createTaskActivityInput,
  type CrmViewMode,
  type LeadContactPatch,
  type LeadCreateDraft,
  type LeadFilters,
} from "./crmPipelineModels";
import { createRuntimeProductCrmApi } from "./runtimeApi";
import type { CreateProductCrmActivityInput } from "./productCrmTypes";
import type {
  LeadActivitiesById,
  LeadVehicleOption,
} from "./CrmPipelineViewTypes";
import { createLeadVehicleOption } from "./crmModuleData";
import { createLeadWithInitialStage } from "./crmLeadCreation";
import { CrmWhatsappInbox } from "./CrmWhatsappInbox";
import {
  crmSurfaceHash,
  readCrmLeadIdFromHash,
  readCrmSurfaceFromHash,
  type CrmSurface,
} from "./crmRouteState";
import { useCrmPipelines } from "./useCrmPipelines";
import { useCrmLeadBoard } from "./useCrmLeadBoard";

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
  const [filters, setFilters] = useState<LeadFilters>({
    search: "",
    source: "all",
    status: "all",
  });
  const [vehicleOptions, setVehicleOptions] = useState<LeadVehicleOption[]>([]);
  const [viewMode, setViewMode] = useState<CrmViewMode>("kanban");
  const canLoadPipeline = activeSurface !== "whatsapp";
  const pipelinesState = useCrmPipelines("crm", crmApi, canLoadPipeline);
  const board = useCrmLeadBoard(
    crmApi,
    pipelinesState.activePipeline,
    filters,
    canLoadPipeline,
  );
  const leads = board.leads;
  const activeActivities = activeLeadId
    ? (activitiesByLeadId[activeLeadId] ?? [])
    : [];

  useEffect(() => {
    if (routeSurface) setActiveSurface(routeSurface);
  }, [routeSurface]);

  useEffect(() => {
    if (!activeLeadId || activitiesByLeadId[activeLeadId]) return undefined;
    let isActive = true;
    void crmApi.listActivities(activeLeadId).then(
      (activities) => {
        if (isActive) {
          setActivitiesByLeadId((current) => ({
            ...current,
            [activeLeadId]: activities,
          }));
        }
      },
      () => {
        if (isActive) {
          setActivitiesByLeadId((current) => ({
            ...current,
            [activeLeadId]: [],
          }));
        }
      },
    );
    return () => {
      isActive = false;
    };
  }, [activeLeadId, activitiesByLeadId, crmApi]);

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

    if (input.initialNote) {
      await createActivity(lead.id, createNoteActivityInput(input.initialNote));
    }
    if (input.taskDueAt && input.taskTitle) {
      await createActivity(
        lead.id,
        createTaskActivityInput(input.taskTitle, input.taskDueAt),
      );
    }
    await board.refresh();
    setActiveLeadId(lead.id);
  };

  const moveLeadPipelineStage = async (
    leadId: string,
    pipelineStageId: string,
  ) => {
    await crmApi.moveLeadPipelineStage(leadId, {
      pipelineStageId,
    });
    await board.refresh();
  };

  const updateLeadContact = async (leadId: string, input: LeadContactPatch) => {
    await crmApi.updateLead(leadId, input);
    await board.refresh();
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
    await board.refresh();
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
      error={board.error}
      filters={filters}
      isLoading={board.isLoading}
      leads={leads}
      loadingStageIds={board.loadingStageIds}
      onChangeFilters={setFilters}
      onChangeViewMode={setViewMode}
      onCreateActivity={createActivity}
      onCreateLead={createLead}
      onLoadMoreStage={board.loadMoreStage}
      onMoveLeadPipelineStage={moveLeadPipelineStage}
      onSelectLead={setActiveLeadId}
      onUpdateLead={updateLeadContact}
      pipelinesState={pipelinesState}
      stageTotals={board.stageTotals}
      vehicleOptions={vehicleOptions}
      viewLeads={leads}
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
