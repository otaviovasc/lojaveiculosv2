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
  "af3fb0636be02707d94adebb39d3d81200dcb69c78690c2b171b7bc1d4a68cf7";

describe("local seed commercial policy", () => {
  it("accepts one historical contract beside current catalog fixtures", async () => {
    const summary = await assertBilling(
      fakeDb([
        [
          { items: 3, monthlyCents: 67790, storeId: seedIds.primaryStore },
          { items: 2, monthlyCents: 47800, storeId: seedIds.branchStore },
          { items: 1, monthlyCents: 29900, storeId: seedIds.foreignStore },
        ],
        [
          {
            branchSuspended: 3,
            foreignTrialing: 5,
            isolationStatus: "trialing",
            sharedStatus: "past_due",
          },
        ],
        [
          {
            activePointers: 1,
            activeVersion: "2026-08-v2",
            checksum: currentChecksum,
            currentAddons: 6,
            currentFiscalCents: 5000,
            currentStores: 2,
            historicalFiscalCents: 19990,
            historicalItems: 3,
            historicalSubscriptions: 1,
            trialCrmEffective: 0,
          },
        ],
      ]),
    );

    expect(summary).toMatchObject({
      activeCatalog: "2026-08-v2",
      currentAddons: 6,
      currentStores: 2,
      historicalItems: 3,
      historicalSubscriptions: 1,
      trialCrmEffective: 0,
    });
  });

  it("rejects trial CRM access without the paid add-on", async () => {
    await expect(
      assertBilling(
        fakeDb([
          [
            { items: 3, monthlyCents: 67790, storeId: seedIds.primaryStore },
            { items: 2, monthlyCents: 47800, storeId: seedIds.branchStore },
            { items: 1, monthlyCents: 29900, storeId: seedIds.foreignStore },
          ],
          [
            {
              branchSuspended: 3,
              foreignTrialing: 5,
              isolationStatus: "trialing",
              sharedStatus: "past_due",
            },
          ],
          [
            {
              activePointers: 1,
              activeVersion: "2026-08-v2",
              checksum: currentChecksum,
              currentAddons: 6,
              currentFiscalCents: 5000,
              currentStores: 2,
              historicalFiscalCents: 19990,
              historicalItems: 3,
              historicalSubscriptions: 1,
              trialCrmEffective: 1,
            },
          ],
        ]),
      ),
    ).rejects.toThrow("CRM must remain denied");
  });

  it("keeps current scenarios on v2 and labels the sole v1 contract", async () => {
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

    expect(scenarios).toContain("2026-08-v2");
    expect(scenarios).not.toContain("2026-08-v1");
    expect(billing).toContain("historical_contract_not_repriced");
    expect(invariants).toContain(
      "active catalog pricing must not reprice the historical contract",
    );
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
      '{"agency":108,"admin":102,"owner":108,"investor":14,"salesman":46,"supervisor":78}',
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
