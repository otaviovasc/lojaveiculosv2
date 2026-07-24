export type FiscalAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

export type FiscalDocumentStatus =
  | "authorized"
  | "cancelled"
  | "draft"
  | "error"
  | "failed"
  | "issued"
  | "processing"
  | "queued"
  | "rejected";

export type FiscalDocument = {
  accessKey: string | null;
  createdAt: string;
  documentKind: "nfe" | "nfse";
  documentType: string;
  id: string;
  issuedAt: string | null;
  metadata: Record<string, unknown>;
  provider: "spedy";
  providerDocumentId: string | null;
  recipientId: string | null;
  status: FiscalDocumentStatus;
  templateId: string | null;
  templateVersion: number | null;
};

export type FiscalRecipient = {
  address: Record<string, unknown>;
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
  tradeName: string | null;
};

export type FiscalTemplate = {
  descriptionTemplate: string;
  id: string;
  isActive: boolean;
  isDefaultForRecipient: boolean;
  name: string;
  recipientId: string | null;
  requirements: Record<string, unknown>;
  retentionConfig: Record<string, unknown>;
  serviceMunicipalCode: string | null;
  serviceNationalCode: string;
  taxConfig: Record<string, unknown>;
  useCase: string;
  version: number;
};

export type FiscalOverview = {
  documents: FiscalDocument[];
  provider: {
    configured: boolean;
    missingConfiguration: readonly string[];
    provider: "spedy";
    webhookConfigured: boolean;
  };
  summary: {
    cancelled: number;
    failed: number;
    issued: number;
    pending: number;
  };
};

export type IssueFiscalDocumentInput = {
  documentKind?: "nfe" | "nfse";
  documentType: string;
  externalReference: string;
  metadata?: Record<string, unknown>;
  recipientId?: string | null;
  templateId?: string | null;
  templateVariables?: Record<string, unknown>;
};

/**
 * Mirrors the NF-e vehicle metadata contract consumed by the API in
 * `apps/api/src/domains/fiscal/documents/nfeVehiclePayload.ts`.
 * Numeric fields accept strings because the backend normalizes them.
 */
export type VehicleNfeVehicle = {
  brand?: string;
  chassis?: string;
  color?: string;
  condition?: string;
  cylinderCapacity?: string;
  engineNumber?: string;
  fuelType?: string;
  grossWeight?: number | string;
  id?: string;
  manufactureYear?: number | string;
  model?: string;
  modelYear?: number | string;
  netWeight?: number | string;
  odometer?: number | string;
  plate?: string;
  power?: string;
  renavam?: string;
  salePrice?: number;
  version?: string;
  year?: number | string;
};

export type VehicleNfeFiscal = {
  cfop: string;
  cofins?: Record<string, unknown>;
  cst?: string;
  csosn?: string;
  icms?: Record<string, unknown>;
  ipi?: Record<string, unknown>;
  ncm: string;
  origin: string;
  pis?: Record<string, unknown>;
};

export type VehicleNfeMetadata = {
  buyer: {
    document: string;
    name: string;
  };
  fiscal: VehicleNfeFiscal;
  operation: {
    type: string;
  };
  sale: {
    id?: string;
    price: number;
  };
  vehicle: VehicleNfeVehicle;
};

export type PreviewTemplateResult = {
  renderedDescription: string;
  templateId: string;
  unresolvedVariables: readonly string[];
  usedVariables: readonly string[];
  version: number;
};
