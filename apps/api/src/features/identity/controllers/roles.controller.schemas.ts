import { z } from "zod";

const permissionOverrideSchema = z.object({
  allowed: z.boolean(),
  permission: z.string().min(1),
  reason: z.string().nullable().optional(),
});

export const updateMembershipAccessSchema = z.object({
  overrides: z.array(permissionOverrideSchema).max(80).default([]),
  role: z.enum(["owner", "supervisor", "salesman"]),
});
