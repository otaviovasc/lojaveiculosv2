import { z } from "zod";

const metadataSchema = z.record(z.string(), z.unknown());
const nullableIdSchema = z.string().trim().uuid().nullable().optional();

const recipientBaseSchema = z.object({
  address: metadataSchema.default({}),
  defaultServiceTemplateId: nullableIdSchema,
  documentNumber: z.string().trim().min(11).max(32),
  documentType: z.enum(["cnpj", "cpf"]),
  email: z.string().trim().email().max(191).nullable().optional(),
  isActive: z.boolean().optional().default(true),
  legalName: z.string().trim().min(2).max(191),
  municipalRegistration: z.string().trim().max(80).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  stateRegistration: z.string().trim().max(80).nullable().optional(),
  tradeName: z.string().trim().max(191).nullable().optional(),
});

const templateBaseSchema = z.object({
  cityServiceCode: z.string().trim().max(80).nullable().optional(),
  defaultMunicipalityOfIncidence: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional(),
  defaultServiceLocation: z.string().trim().max(120).nullable().optional(),
  defaultTaxationType: z.string().trim().max(80).nullable().optional(),
  descriptionTemplate: z.string().trim().min(1).max(4000),
  includeApproximateTaxes: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  isDefaultForRecipient: z.boolean().optional().default(false),
  name: z.string().trim().min(2).max(140),
  recipientId: nullableIdSchema,
  requirements: metadataSchema.default({}),
  retentionConfig: metadataSchema.default({}),
  serviceMunicipalCode: z.string().trim().max(80).nullable().optional(),
  serviceNationalCode: z.string().trim().min(1).max(40),
  taxConfig: metadataSchema.default({}),
  useCase: z.enum([
    "administrative_service",
    "bank_marketing",
    "consortium_commission",
    "financing_commission",
    "financing_intermediation",
    "insurance_commission",
    "other",
    "vehicle_documentation_service",
    "warranty_commission",
  ]),
  version: z.number().int().positive().optional(),
});

export const issueFiscalDocumentSchema = z.object({
  documentKind: z.enum(["nfe", "nfse"]).optional(),
  documentType: z.string().trim().min(1).max(80),
  externalReference: z.string().trim().min(1).max(191),
  metadata: metadataSchema.optional(),
  recipientId: nullableIdSchema,
  templateId: nullableIdSchema,
  templateVariables: metadataSchema.optional(),
});

export const cancelFiscalDocumentSchema = z.object({
  providerDocumentId: z.string().trim().min(1).max(191),
  reason: z.string().trim().min(5).max(320),
});

export const syncFiscalDocumentSchema = z.object({
  providerDocumentId: z.string().trim().min(1).max(191),
});

export const createFiscalRecipientSchema = recipientBaseSchema;
export const updateFiscalRecipientSchema = recipientBaseSchema.partial();

export const createFiscalTemplateSchema = templateBaseSchema;
export const updateFiscalTemplateSchema = templateBaseSchema.partial();

export const listFiscalTemplatesQuerySchema = z.object({
  recipientId: z.string().trim().uuid().nullable().optional(),
});

export const previewFiscalTemplateSchema = z.object({
  templateId: z.string().trim().uuid(),
  variables: metadataSchema.default({}),
});
