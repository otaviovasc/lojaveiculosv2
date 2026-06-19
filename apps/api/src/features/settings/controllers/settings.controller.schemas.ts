import { z } from "zod";

const nullableText = (max: number) =>
  z.string().trim().max(max).nullable().optional();

const recordSchema = z.record(z.string(), z.unknown());

export const updateStoreSettingsSchema = z.object({
  identity: z
    .object({
      legalName: nullableText(191),
      primaryDomain: nullableText(191),
      publicSlug: z.string().trim().max(80).optional(),
      tradingName: z.string().trim().min(1).max(191).optional(),
    })
    .optional(),
  profile: z
    .object({
      addressCity: nullableText(120),
      addressLine1: nullableText(191),
      addressLine2: nullableText(191),
      addressState: nullableText(80),
      addressZipCode: nullableText(32),
      businessHours: recordSchema.optional(),
      contactEmail: z.string().email().nullable().optional(),
      contactPhone: nullableText(40),
      documentNumber: nullableText(32),
      logoImageUrl: z.string().url().nullable().optional(),
      whatsappPhone: nullableText(40),
    })
    .optional(),
  publicSite: z
    .object({
      customDomain: nullableText(191),
      heroImageUrl: z.string().url().nullable().optional(),
      isPublished: z.boolean().optional(),
      layoutKey: z.string().trim().min(1).max(80).optional(),
      seoDescription: nullableText(320),
      seoTitle: nullableText(191),
      theme: recordSchema.optional(),
    })
    .optional(),
});
