import type { PermissionKey } from "@lojaveiculosv2/shared";

export type PermissionRisk = "high" | "medium" | "low";

export type PermissionDescriptor = {
  description: string;
  key: PermissionKey;
  label: string;
  risk: PermissionRisk;
};

export type PermissionGroup = {
  key: string;
  label: string;
  permissions: readonly PermissionDescriptor[];
};

export function permission(
  key: PermissionKey,
  label: string,
  description: string,
  risk: PermissionRisk,
): PermissionDescriptor {
  return { description, key, label, risk };
}
