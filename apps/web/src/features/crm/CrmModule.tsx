import { useCallback, useEffect, useMemo, useState } from "react";
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
  ProductCrmLeadActivity,
} from "./productCrmTypes";

export function CrmModule({ api }: { api?: ProductCrmApi }) {
  const crmApi = useMemo(() => api ?? createRuntimeProductCrmApi(), [api]);
  const [activities, setActivities] = useState<ProductCrmLeadActivity[]>([]);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<LeadFilters>({
    search: "",
    source: "all",
    status: "all",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<ProductCrmLead[]>([]);
  const [viewMode, setViewMode] = useState<CrmViewMode>("kanban");

  const refreshLeads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const nextLeads = await crmApi.listLeads({ limit: 100 });
      setLeads(nextLeads);
      setActiveLeadId((current) =>
        nextLeads.some((lead) => lead.id === current)
          ? current
          : (nextLeads[0]?.id ?? null),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    } finally {
      setIsLoading(false);
    }
  }, [crmApi]);

  useEffect(() => {
    void refreshLeads();
  }, [refreshLeads]);

  useEffect(() => {
    if (!activeLeadId) {
      setActivities([]);
      return;
    }

    let isActive = true;
    crmApi
      .listActivities(activeLeadId)
      .then((nextActivities) => {
        if (isActive) setActivities(nextActivities);
      })
      .catch((caught: unknown) => {
        if (!isActive) return;
        setError(caught instanceof Error ? caught : new Error(String(caught)));
      });

    return () => {
      isActive = false;
    };
  }, [activeLeadId, crmApi]);

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
    setActiveLeadId(lead.id);
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
    setActivities((current) =>
      leadId === activeLeadId ? [activity, ...current] : current,
    );
    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId
          ? { ...lead, lastInteractionAt: activity.occurredAt }
          : lead,
      ),
    );
  };

  return (
    <CrmPipelineView
      activities={activities}
      activeLeadId={activeLeadId}
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
      viewLeads={filterLeads(leads, filters)}
      viewMode={viewMode}
    />
  );
}
