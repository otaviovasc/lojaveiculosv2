import {
  formatBrazilianCnpj,
  isValidBrazilianCnpj,
} from "@lojaveiculosv2/shared";
import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .transform((value) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80),
  )
  .pipe(
    z
      .string()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  );
const optionalTextSchema = z.string().trim().min(1).max(191).optional();
const emailSchema = z.string().trim().email().max(254);
const cnpjSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .refine(isValidBrazilianCnpj, "Informe um CNPJ válido.")
  .transform(formatBrazilianCnpj);

export const profileDraftSchema = z
  .object({
    contactEmail: emailSchema.optional(),
    contactPhone: z.string().trim().min(3).max(40).optional(),
    documentNumber: cnpjSchema.optional(),
    whatsappPhone: z.string().trim().min(3).max(40).optional(),
  })
  .optional();

export const createOwnerStoreSchema = z.object({
  profile: profileDraftSchema,
  publicSlug: slugSchema,
  storeLegalName: optionalTextSchema,
  storeTradingName: z.string().trim().min(2).max(191),
  tenantLegalName: optionalTextSchema,
  tenantTradingName: optionalTextSchema,
});

export const createAgencySchema = z.object({
  firstUser: z
    .object({
      email: emailSchema,
      name: optionalTextSchema,
    })
    .optional(),
  tenantLegalName: optionalTextSchema,
  tenantSlug: slugSchema,
  tenantTradingName: z.string().trim().min(2).max(191),
});

export const createAgencyStoreSchema = z.object({
  profile: profileDraftSchema,
  publicSlug: slugSchema,
  storeLegalName: optionalTextSchema,
  storeTradingName: z.string().trim().min(2).max(191),
  tenantId: z.string().uuid(),
});

export const inviteStoreMemberSchema = z.object({
  email: emailSchema,
  name: optionalTextSchema,
  role: z.enum(["investor", "owner", "salesman", "supervisor"]),
});

export const resendInvitationParamsSchema = z.object({
  invitationId: z.string().uuid(),
});
