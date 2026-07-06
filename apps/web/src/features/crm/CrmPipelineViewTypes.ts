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
import type { ProductCrmApi } from "./productCrmApi";

export type LeadActivitiesById = Record<string, ProductCrmLeadActivity[]>;

export type LeadVehicleOption = {
  detail: string;
  id: string;
  label: string;
  imageUrl?: string | null;
  priceCents?: number | null;
  manufactureYear?: number | null;
  modelYear?: number | null;
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
  onMoveLeadPipelineStage: (
    leadId: string,
    pipelineStageId: string,
  ) => Promise<void>;
  onRefresh: () => Promise<void>;
  onSelectLead: (leadId: string | null) => void;
  onUpdateLead: (leadId: string, input: LeadContactPatch) => Promise<void>;
  pipelineApi: ProductCrmApi;
  vehicleOptions: LeadVehicleOption[];
  viewLeads: ProductCrmLead[];
  viewMode: CrmViewMode;
};

export type CrmLeadDetailFullPageProps = {
  lead: ProductCrmLead;
  activities: ProductCrmLeadActivity[];
  onBack: () => void;
  onUpdateLead: (leadId: string, input: LeadContactPatch) => Promise<void>;
  onUpdateStatus: (leadId: string, status: CrmLeadStatus) => Promise<void>;
  onCreateActivity: (
    leadId: string,
    input: CreateProductCrmActivityInput,
  ) => Promise<void>;
};

export type TabOption =
  | "visao_geral"
  | "timeline"
  | "casos"
  | "contratos"
  | "financeiro"
  | "anexos"
  | "portal";

import type { PipelineStage } from "./crmPipelineStorage";

export type DetailTab =
  | "visao"
  | "chat"
  | "tarefas"
  | "reunioes"
  | "notas"
  | "arquivos"
  | "financeiro"
  | "seguro"
  | "portal";

export type CrmLeadDetailsPageProps = {
  lead: ProductCrmLead;
  activities: ProductCrmLeadActivity[];
  stages: PipelineStage[];
  onBack: () => void;
  onMoveLeadPipelineStage: (
    leadId: string,
    pipelineStageId: string,
  ) => Promise<void>;
  onCreateActivity: (
    leadId: string,
    input: CreateProductCrmActivityInput,
  ) => Promise<void>;
  vehicleOptions: LeadVehicleOption[];
};

export type CrmListViewProps = {
  leads: ProductCrmLead[];
  stages: PipelineStage[];
  vehicleOptions: LeadVehicleOption[];
  onSelectLead: (leadId: string) => void;
  onMoveLeadPipelineStage: (
    leadId: string,
    pipelineStageId: string,
  ) => Promise<void>;
};
