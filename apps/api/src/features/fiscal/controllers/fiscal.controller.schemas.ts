import { z } from "zod";

const metadataSchema = z.record(z.string(), z.unknown());

export const issueFiscalDocumentSchema = z.object({
  documentType: z.string().trim().min(1).max(80),
  externalReference: z.string().trim().min(1).max(191),
  metadata: metadataSchema.optional(),
});

export const cancelFiscalDocumentSchema = z
  .object({
    reason: z.string().trim().min(5).max(320),
  })
  .strict();

export const syncFiscalDocumentSchema = z.object({}).strict();
