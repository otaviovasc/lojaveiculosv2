import { describe, expect, it } from "vitest";
import {
  sanitizeCustomRolePresets,
  sanitizePermissionOverrides,
} from "./RoleManagementPanel";

const permissionCatalog = new Set([
  "crm.messaging.connection.setup",
  "crm.messaging.connection.pair",
  "inventory.read",
]);

describe("role management permission sanitization", () => {
  it("migrates the retired connection permission and filters unknown keys", () => {
    expect(
      sanitizePermissionOverrides(
        [
          {
            allowed: true,
            permission: "crm.whatsapp.connection.manage",
          },
          { allowed: true, permission: "permissions.from_an_old_catalog" },
          {
            allowed: false,
            permission: "crm.messaging.connection.setup",
          },
          { allowed: true, permission: "inventory.read" },
        ],
        permissionCatalog,
      ),
    ).toEqual([
      { allowed: false, permission: "crm.messaging.connection.setup" },
      { allowed: true, permission: "crm.messaging.connection.pair" },
      { allowed: true, permission: "inventory.read" },
    ]);
  });

  it("uses deny-wins semantics when the retired permission maps to replacements", () => {
    expect(
      sanitizePermissionOverrides(
        [
          {
            allowed: false,
            permission: "crm.whatsapp.connection.manage",
          },
          { allowed: true, permission: "crm.messaging.connection.setup" },
          { allowed: true, permission: "crm.messaging.connection.pair" },
        ],
        permissionCatalog,
      ),
    ).toEqual([
      { allowed: false, permission: "crm.messaging.connection.setup" },
      { allowed: false, permission: "crm.messaging.connection.pair" },
    ]);
  });

  it("sanitizes stale custom presets before they are persisted or submitted", () => {
    expect(
      sanitizeCustomRolePresets(
        [
          {
            baseRole: "salesman",
            id: "custom_stale",
            name: "Atendimento legado",
            overrides: [
              {
                allowed: true,
                permission: "crm.whatsapp.connection.manage",
              },
              { allowed: false, permission: "crm.messaging.connection.setup" },
              { allowed: true, permission: "permission.removed" },
            ],
          },
        ],
        permissionCatalog,
      ),
    ).toEqual([
      {
        baseRole: "salesman",
        id: "custom_stale",
        name: "Atendimento legado",
        overrides: [
          { allowed: false, permission: "crm.messaging.connection.setup" },
          { allowed: true, permission: "crm.messaging.connection.pair" },
        ],
      },
    ]);
  });
});
