import { z } from "zod";

export const documentKinds = [
  "buyer_document",
  "delivery_term",
  "finance_receipt",
  "inspection",
  "internal",
  "invoice",
  "other",
  "power_of_attorney",
  "reservation_receipt",
  "sale_receipt",
  "sale_contract",
  "test_drive",
  "vehicle_registration",
] as const;

export const documentStatuses = [
  "archived",
  "draft",
  "issued",
  "pending_signature",
  "signed",
  "voided",
] as const;

export const documentLinkTargets = [
  "finance_entry",
  "financing_inquiry",
  "fiscal_document",
  "lead",
  "sale",
  "sale_payment",
  "store",
  "vehicle_unit",
] as const;

export const documentTemplateKinds = [
  "delivery_term",
  "power_of_attorney",
  "reservation_receipt",
  "sale_contract",
  "sale_receipt",
] as const;

export const listDocumentsQuerySchema = z.object({
  kind: z.enum(documentKinds).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  status: z.enum(documentStatuses).optional(),
  targetId: z.string().trim().min(1).optional(),
  targetType: z.enum(documentLinkTargets).optional(),
});

export const requestDocumentUploadSchema = z.object({
  contentType: z.string().trim().min(1).max(120),
  fileName: z.string().trim().min(1).max(191),
  sizeBytes: z.coerce
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024),
  targetId: z.string().trim().min(1).max(191).optional(),
  targetType: z.enum(documentLinkTargets).optional(),
});

export const createUploadedDocumentSchema = z.object({
  fileName: z.string().trim().min(1).max(191),
  fileSizeBytes: z.coerce.number().int().nonnegative().nullable(),
  kind: z.enum(documentKinds),
  mimeType: z.string().trim().min(1).max(120).nullable(),
  storageKey: z.string().trim().min(1).max(512),
  targetId: z.string().trim().min(1).max(191).optional(),
  targetType: z.enum(documentLinkTargets).optional(),
  title: z.string().trim().min(1).max(191),
});

export const updateDocumentMetadataSchema = z
  .object({
    kind: z.enum(documentKinds).optional(),
    linkRole: z.string().trim().min(1).max(80).optional(),
    targetId: z.string().trim().min(1).max(191).optional(),
    targetType: z.enum(documentLinkTargets).optional(),
    title: z.string().trim().min(1).max(191).optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.kind ||
        value.linkRole ||
        value.targetId ||
        value.targetType ||
        value.title,
      ),
    {
      message: "At least one metadata field is required.",
    },
  )
  .refine(
    (value) =>
      !value.targetType ||
      value.targetType === "store" ||
      Boolean(value.targetId),
    {
      message: "Document links require a target id.",
    },
  );

export const updateDocumentTemplateSchema = z.object({
  clauses: z.array(z.string().trim().min(1).max(600)).min(1).max(8),
  title: z.string().trim().min(1).max(191),
});

export const voidDocumentSchema = z.object({
  reason: z.string().trim().min(1).max(400).optional(),
});

export const documentTemplateKindSchema = z.enum(documentTemplateKinds);
