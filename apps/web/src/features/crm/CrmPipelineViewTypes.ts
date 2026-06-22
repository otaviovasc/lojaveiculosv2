import type {
  CrmViewMode,
  LeadContactPatch,
  LeadCreateDraft,
  LeadFilters,
} from "./crmPipelineModels";
import type {
  CreateProductCrmActivityInput,
  CrmLeadStatus,
  ProductCrmLead,
  ProductCrmLeadActivity,
} from "./productCrmTypes";

export type LeadActivitiesById = Record<string, ProductCrmLeadActivity[]>;

export type LeadVehicleOption = {
  detail: string;
  id: string;
  label: string;
};

export type CrmPipelineViewProps = {
  activities: ProductCrmLeadActivity[];
  activeLeadId: string | null;
  allActivities: ProductCrmLeadActivity[];
  error: Error | null;
  filters: LeadFilters;
  isLoading: boolean;
  leads: ProductCrmLead[];
  onChangeFilters: (filters: LeadFilters) => void;
  onChangeViewMode: (mode: CrmViewMode) => void;
  onCreateActivity: (
    leadId: string,
    input: CreateProductCrmActivityInput,
  ) => Promise<void>;
  onCreateLead: (input: LeadCreateDraft) => Promise<void>;
  onRefresh: () => Promise<void>;
  onSelectLead: (leadId: string) => void;
  onUpdateLead: (leadId: string, input: LeadContactPatch) => Promise<void>;
  onUpdateStatus: (leadId: string, status: CrmLeadStatus) => Promise<void>;
  vehicleOptions: LeadVehicleOption[];
  viewLeads: ProductCrmLead[];
  viewMode: CrmViewMode;
};
