import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  crmConversationCyclesPath,
  crmMessagingOperatorPermissions,
  formatBody,
  personas,
  resolveDestination,
} from "./local-permission-smoke.mjs";
import { assertBilling } from "./local-seed-smoke-workflows.mjs";
import { seedIds } from "./local-seed-smoke-support.mjs";

const currentChecksum =
  "32d2f1fe963c01124ffe5469ad166c68bc569c052409861ef12216065ed1ff3d";

describe("local seed commercial policy", () => {
  it("accepts permanent Free for every seeded store", async () => {
    const summary = await assertBilling(
      fakeDb([
        [
          { items: 1, monthlyCents: 0, storeId: seedIds.primaryStore },
          { items: 1, monthlyCents: 0, storeId: seedIds.branchStore },
          { items: 1, monthlyCents: 0, storeId: seedIds.foreignStore },
        ],
        [
          {
            freeEntitlements: 12,
            isolationEndsAt: null,
            isolationStatus: "active",
            paidEntitlements: 0,
            sharedEndsAt: null,
            sharedStatus: "active",
          },
        ],
        [
          {
            activePointers: 1,
            activeVersion: "2026-08-v3",
            checksum: currentChecksum,
            currentAddons: 0,
            currentPlans: 5,
            currentStores: 3,
            freePlateLimit: 3,
            freeSellerLimit: 1,
            freeVehicleLimit: 10,
          },
        ],
      ]),
    );

    expect(summary).toMatchObject({
      activeCatalog: "2026-08-v3",
      currentAddons: 0,
      currentPlans: 5,
      currentStores: 3,
      freeEntitlements: 12,
    });
  });

  it("rejects paid entitlements in the Free fixture", async () => {
    await expect(
      assertBilling(
        fakeDb([
          [
            { items: 1, monthlyCents: 0, storeId: seedIds.primaryStore },
            { items: 1, monthlyCents: 0, storeId: seedIds.branchStore },
            { items: 1, monthlyCents: 0, storeId: seedIds.foreignStore },
          ],
          [
            {
              freeEntitlements: 12,
              isolationEndsAt: null,
              isolationStatus: "active",
              paidEntitlements: 1,
              sharedEndsAt: null,
              sharedStatus: "active",
            },
          ],
          [
            {
              activePointers: 1,
              activeVersion: "2026-08-v3",
              checksum: currentChecksum,
              currentAddons: 0,
              currentPlans: 5,
              currentStores: 3,
              freePlateLimit: 3,
              freeSellerLimit: 1,
              freeVehicleLimit: 10,
            },
          ],
        ]),
      ),
    ).rejects.toThrow("only the four permanent Free entitlements");
  });

  it("keeps current scenarios on v3 Free without add-ons or trials", async () => {
    const [billing, scenarios, invariants] = await Promise.all([
      readFile(
        new URL(
          "../../docker/postgres/seed/product/20-billing.sql",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../../docker/postgres/seed/product/25-commercial-scenarios.sql",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../../docker/postgres/seed/product/90-invariants.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    ]);

    expect(billing).toContain("2026-08-v3");
    expect(billing).toContain(
      "Every store receives one permanent Free contract",
    );
    expect(billing).toContain(
      "GREATEST(now(), starts_at + interval '1 microsecond')",
    );
    expect(scenarios).toContain("no synthetic trial");
    expect(invariants).toContain(
      "every store must have one effective Free contract",
    );
    for (const fixture of [billing, scenarios, invariants]) {
      expect(fixture).not.toContain("crm_zapi");
      expect(fixture).not.toContain("safe_trial");
    }
  });
});

describe("local permission smoke safety and personas", () => {
  it("uses the canonical CRM conversation-cycle permission contract", () => {
    expect(crmConversationCyclesPath).toBe("/crm/conversation-cycles");
    expect(crmMessagingOperatorPermissions).toEqual([
      "crm.attendances.manage",
      "crm.conversations.assign",
      "crm.conversations.manage",
      "crm.conversations.read",
      "crm.messages.send",
    ]);
  });

  it("covers suspended, branch, and isolation actors", () => {
    expect(personas.map(({ key }) => key)).toEqual(
      expect.arrayContaining([
        "branchSalesperson",
        "isolationOwner",
        "suspendedMember",
      ]),
    );
  });

  it("redacts response payloads while retaining safe diagnostics", () => {
    const formatted = formatBody({
      code: "FORBIDDEN",
      customer: "must-not-leak",
      requestId: "request-safe",
    });

    expect(formatted).toBe("code=FORBIDDEN, requestId=request-safe");
    expect(formatted).not.toContain("must-not-leak");
  });

  it("routes suspended users without active memberships to onboarding", () => {
    expect(
      resolveDestination({ defaultStore: null, tenantMemberships: [] }),
    ).toBe("/onboarding");
  });

  it("keeps runtime seeds on the split connection permissions", async () => {
    const [initialProjection, localProjection, migration, invariants] =
      await Promise.all([
        readFile(
          new URL(
            "../../packages/db/migrations/0002_seed_role_templates.sql",
            import.meta.url,
          ),
          "utf8",
        ),
        readFile(
          new URL(
            "../../docker/postgres/seed/product/16-role-permissions.sql",
            import.meta.url,
          ),
          "utf8",
        ),
        readFile(
          new URL(
            "../../packages/db/migrations/0024_split_crm_connection_permissions.sql",
            import.meta.url,
          ),
          "utf8",
        ),
        readFile(
          new URL(
            "../../docker/postgres/seed/product/90-invariants.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      ]);
    const legacyPermission = "crm.whatsapp.connection.manage";

    for (const projection of [initialProjection, localProjection]) {
      expect(projection).not.toContain(legacyPermission);
      expect(projection).toContain("crm.messaging.connection.setup");
      expect(projection).toContain("crm.messaging.connection.pair");
    }
    expect(localProjection).toContain(
      '{"agency":116,"admin":108,"owner":116,"investor":15,"salesman":48,"supervisor":81}',
    );
    expect(migration).toContain(
      'DELETE FROM "membership_permission_overrides"',
    );
    expect(migration).toContain('DELETE FROM "role_template_permissions"');
    expect(invariants).toContain(
      "seed invariant: legacy CRM connection permission remains",
    );
  });
});

function fakeDb(responses) {
  const pending = [...responses];
  return function db(first) {
    if (!first?.raw) return first;
    const response = pending.shift();
    if (!response) throw new Error("Unexpected seed smoke query.");
    return Promise.resolve(response);
  };
}
