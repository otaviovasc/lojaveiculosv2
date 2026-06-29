import { z } from "zod";

export const WorkspaceRoleSchema = z.enum([
  "SUPER_ADMIN",
  "PARTNER",
  "OWNER",
  "ADMIN",
  "CORRETOR",
  "VIEWER",
]);
export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;

export const SessionSchema = z.object({
  userId: z.string(),
  clerkId: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
});
export type Session = z.infer<typeof SessionSchema>;

export const WorkspaceMemberSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  role: WorkspaceRoleSchema,
  user: z
    .object({
      name: z.string().nullable(),
      email: z.string(),
      avatarUrl: z.string().nullable(),
    })
    .optional(),
});
export type WorkspaceMemberInfo = z.infer<typeof WorkspaceMemberSchema>;

export const InviteCreateSchema = z.object({
  email: z.string().email(),
  role: WorkspaceRoleSchema.exclude(["SUPER_ADMIN", "OWNER"]),
});
export type InviteCreate = z.infer<typeof InviteCreateSchema>;

export const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  SUPER_ADMIN: 6,
  PARTNER: 5,
  OWNER: 4,
  ADMIN: 3,
  CORRETOR: 2,
  VIEWER: 1,
};

export function hasMinRole(
  userRole: WorkspaceRole,
  requiredRole: WorkspaceRole,
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
