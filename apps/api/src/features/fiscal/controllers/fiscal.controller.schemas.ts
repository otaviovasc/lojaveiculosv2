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

export const cancelFiscalDocumentSchema = z
  .object({
    reason: z.string().trim().min(5).max(320),
  })
  .strict();

export const syncFiscalDocumentSchema = z.object({}).strict();
export const spedyWebhookSchema = metadataSchema;

const issuerProfileSchema = z.object({
  address: z.object({
    additionalInformation: z.string().trim().max(191).optional(),
    city: z.object({
      code: z.number().int().positive(),
      name: z.string().trim().min(2).max(120),
      state: z.string().trim().length(2),
    }),
    district: z.string().trim().min(1).max(80),
    number: z.string().trim().min(1).max(20),
    postalCode: z.string().trim().min(8).max(12),
    street: z.string().trim().min(1).max(120),
  }),
  cityTaxNumber: z.string().trim().max(80).optional(),
  economicActivities: z
    .array(
      z.object({
        code: z.string().trim().min(4).max(20),
        type: z.enum(["main", "secondary"]),
      }),
    )
    .optional(),
  email: z.string().trim().email().max(191).optional(),
  federalTaxNumber: z.string().trim().min(14).max(18),
  legalName: z.string().trim().min(2).max(191),
  name: z.string().trim().min(2).max(191),
  phone: z.string().trim().max(40).optional(),
  simplesNacionalTaxRegime: z.string().trim().max(80).optional(),
  specialTaxRegime: z.string().trim().max(80).optional(),
  stateTaxNumber: z.string().trim().max(80).optional(),
  taxRegime: z.string().trim().max(80).optional(),
});

export const setupFiscalConnectionSchema = z.object({
  issuerProfile: issuerProfileSchema,
  taxDefaults: metadataSchema.optional(),
});

export const confirmFiscalDefaultsSchema = z.object({
  taxDefaults: metadataSchema.refine(
    (value) => Object.keys(value).length > 0,
    "At least one reviewed fiscal default is required.",
  ),
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
