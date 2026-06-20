import { z } from "zod";
import { permissionGroups } from "../../../domains/identity/domain/permissionCatalog.js";

const permissionKeys = new Set(
  permissionGroups.flatMap((group) =>
    group.permissions.map((permission) => permission.key),
  ),
);

const permissionOverrideSchema = z.object({
  allowed: z.boolean(),
  permission: z
    .string()
    .min(1)
    .refine((key) => permissionKeys.has(key as never)),
  reason: z.string().nullable().optional(),
});

export const updateMembershipAccessSchema = z.object({
  overrides: z.array(permissionOverrideSchema).max(80).default([]),
  role: z.enum(["investor", "owner", "supervisor", "salesman"]),
});
