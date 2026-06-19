import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProductCrmApi } from "./productCrmApi";
import { CrmPipelineView } from "./CrmPipelineView";
import { createRuntimeProductCrmApi } from "./runtimeApi";
import type {
  CreateProductCrmActivityInput,
  CreateProductCrmLeadInput,
  CrmLeadStatus,
  ProductCrmLead,
  ProductCrmLeadActivity,
} from "./productCrmTypes";

export function CrmModule({ api }: { api?: ProductCrmApi }) {
  const crmApi = useMemo(() => api ?? createProductCrmApiFromRuntime(), [api]);
  const [activities, setActivities] = useState<ProductCrmLeadActivity[]>([]);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<ProductCrmLead[]>([]);

  const refreshLeads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const nextLeads = await crmApi.listLeads({ limit: 80 });
      setLeads(nextLeads);
      setActiveLeadId((current) => current ?? nextLeads[0]?.id ?? null);
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

  const createLead = async (input: CreateProductCrmLeadInput) => {
    const lead = await crmApi.createLead(input);
    setLeads((current) => [lead, ...current]);
    setActiveLeadId(lead.id);
  };

  const updateLeadStatus = async (leadId: string, status: CrmLeadStatus) => {
    const lead = await crmApi.updateLead(leadId, { status });
    setLeads((current) =>
      current.map((item) => (item.id === lead.id ? lead : item)),
    );
  };

  const createActivity = async (
    leadId: string,
    input: CreateProductCrmActivityInput,
  ) => {
    const activity = await crmApi.createActivity(leadId, input);
    setActivities((current) => [activity, ...current]);
  };

  return (
    <CrmPipelineView
      activities={activities}
      activeLeadId={activeLeadId}
      error={error}
      isLoading={isLoading}
      leads={leads}
      onCreateActivity={createActivity}
      onCreateLead={createLead}
      onRefresh={refreshLeads}
      onSelectLead={setActiveLeadId}
      onUpdateStatus={updateLeadStatus}
    />
  );
}

function createProductCrmApiFromRuntime(): ProductCrmApi {
  return createRuntimeProductCrmApi();
}
