import { z } from "zod";

const RESERVED_SLUGS = [
  "admin",
  "api",
  "auth",
  "blog",
  "docs",
  "help",
  "login",
  "signup",
  "settings",
  "dashboard",
  "app",
  "www",
  "mail",
  "ftp",
  "static",
  "assets",
  "cdn",
  "images",
  "support",
  "status",
  "billing",
  "webhook",
  "webhooks",
  "pricing",
  "terms",
  "privacy",
];

export const WorkspaceSlugSchema = z
  .string()
  .min(3, "Mínimo 3 caracteres")
  .max(30, "Máximo 30 caracteres")
  .regex(
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
    "Apenas letras minúsculas, números e hífens",
  )
  .refine((slug) => !RESERVED_SLUGS.includes(slug), {
    message: "Este nome está reservado",
  });

export const WorkspaceCreateSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(60),
  slug: WorkspaceSlugSchema,
});
export type WorkspaceCreate = z.infer<typeof WorkspaceCreateSchema>;

export const WorkspaceUpdateSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  customDomain: z.string().min(4).optional().nullable(),
});
export type WorkspaceUpdate = z.infer<typeof WorkspaceUpdateSchema>;

export const PlanStatusSchema = z.enum([
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
  "INACTIVE",
]);
export type PlanStatus = z.infer<typeof PlanStatusSchema>;

export { RESERVED_SLUGS };
