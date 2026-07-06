import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { LeadStatus } from "./crmRepository.js";

export type CrmPipelineStageStatus = "open" | "won" | "lost";

export type CrmPipelineStage = {
  color: string;
  createdAt: Date;
  id: string;
  isSystem: boolean;
  leadStatus: LeadStatus;
  name: string;
  pipelineId: string;
  slaDays: number | null;
  sortOrder: number;
  status: CrmPipelineStageStatus;
  storeId: StoreId;
  tenantId: TenantId;
  updatedAt: Date;
};

export type CrmPipeline = {
  createdAt: Date;
  description: string;
  id: string;
  isDefault: boolean;
  name: string;
  rotationActive: boolean;
  stages: CrmPipelineStage[];
  storeId: StoreId;
  tenantId: TenantId;
  updatedAt: Date;
};

export type CrmPipelineStageInput = {
  color: string;
  id?: string;
  isSystem?: boolean;
  leadStatus: LeadStatus;
  name: string;
  slaDays?: number | null;
  sortOrder?: number;
  status: CrmPipelineStageStatus;
};

export type CreateCrmPipelineRepositoryInput = {
  description?: string;
  isDefault?: boolean;
  name: string;
  rotationActive?: boolean;
  stages: CrmPipelineStageInput[];
  storeId: StoreId;
  tenantId: TenantId;
};

export type UpdateCrmPipelineRepositoryInput = {
  description?: string;
  isDefault?: boolean;
  name?: string;
  pipelineId: string;
  rotationActive?: boolean;
  stages?: CrmPipelineStageInput[];
  storeId: StoreId;
  tenantId: TenantId;
};

export type CrmPipelineRepository = {
  createPipeline: (
    input: CreateCrmPipelineRepositoryInput,
  ) => Promise<CrmPipeline>;
  deletePipeline: (input: {
    pipelineId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<boolean>;
  findPipelineById: (input: {
    pipelineId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<CrmPipeline | null>;
  findStageById: (input: {
    stageId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<CrmPipelineStage | null>;
  listPipelines: (input: {
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<readonly CrmPipeline[]>;
  updatePipeline: (
    input: UpdateCrmPipelineRepositoryInput,
  ) => Promise<CrmPipeline | null>;
};
