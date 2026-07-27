export type FiscalServiceRecipient = {
  address: Record<string, unknown>;
  createdAt: Date;
  defaultServiceTemplateId: string | null;
  documentNumber: string;
  documentType: "cnpj" | "cpf";
  email: string | null;
  id: string;
  isActive: boolean;
  legalName: string;
  municipalRegistration: string | null;
  notes: string | null;
  phone: string | null;
  stateRegistration: string | null;
  storeId: string;
  tenantId: string;
  tradeName: string | null;
  updatedAt: Date;
};

export type FiscalServiceTemplateUseCase =
  | "administrative_service"
  | "bank_marketing"
  | "consortium_commission"
  | "financing_commission"
  | "financing_intermediation"
  | "insurance_commission"
  | "other"
  | "vehicle_documentation_service"
  | "warranty_commission";

export type FiscalServiceInvoiceTemplate = {
  cityServiceCode: string | null;
  createdAt: Date;
  defaultMunicipalityOfIncidence: string | null;
  defaultServiceLocation: string | null;
  defaultTaxationType: string | null;
  descriptionTemplate: string;
  id: string;
  includeApproximateTaxes: boolean;
  isActive: boolean;
  isDefaultForRecipient: boolean;
  name: string;
  recipientId: string | null;
  requirements: Record<string, unknown>;
  retentionConfig: Record<string, unknown>;
  serviceMunicipalCode: string | null;
  serviceNationalCode: string;
  storeId: string;
  taxConfig: Record<string, unknown>;
  tenantId: string;
  updatedAt: Date;
  useCase: FiscalServiceTemplateUseCase;
  version: number;
};

export type CreateFiscalRecipientInput = {
  address?: Record<string, unknown> | undefined;
  defaultServiceTemplateId?: string | null | undefined;
  documentNumber: string;
  documentType: "cnpj" | "cpf";
  email?: string | null | undefined;
  isActive?: boolean | undefined;
  legalName: string;
  municipalRegistration?: string | null | undefined;
  notes?: string | null | undefined;
  phone?: string | null | undefined;
  stateRegistration?: string | null | undefined;
  storeId: string;
  tenantId: string;
  tradeName?: string | null | undefined;
};

export type UpdateFiscalRecipientInput = Partial<
  Omit<CreateFiscalRecipientInput, "storeId" | "tenantId">
> & {
  id: string;
  storeId: string;
  tenantId: string;
};

export type CreateFiscalTemplateInput = {
  cityServiceCode?: string | null | undefined;
  defaultMunicipalityOfIncidence?: string | null | undefined;
  defaultServiceLocation?: string | null | undefined;
  defaultTaxationType?: string | null | undefined;
  descriptionTemplate: string;
  includeApproximateTaxes?: boolean | undefined;
  isActive?: boolean | undefined;
  isDefaultForRecipient?: boolean | undefined;
  name: string;
  recipientId?: string | null | undefined;
  requirements?: Record<string, unknown> | undefined;
  retentionConfig?: Record<string, unknown> | undefined;
  serviceMunicipalCode?: string | null | undefined;
  serviceNationalCode: string;
  storeId: string;
  taxConfig?: Record<string, unknown> | undefined;
  tenantId: string;
  useCase: FiscalServiceTemplateUseCase;
  version?: number | undefined;
};

export type UpdateFiscalTemplateInput = Partial<
  Omit<CreateFiscalTemplateInput, "storeId" | "tenantId">
> & {
  id: string;
  storeId: string;
  tenantId: string;
};
