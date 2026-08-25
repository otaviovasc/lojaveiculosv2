import { describe, expect, it } from "vitest";
import {
  buildCrmUiDemoFixtures,
  CRM_UI_DEMO_NAMESPACE,
  deterministicFixtureId,
} from "./crm-ui-demo-fixtures.mjs";
import { parseCrmUiDemoSeedArgs } from "./crm-ui-demo-seed-support.mjs";
import { runCrmUiDemoSeed } from "./seed-crm-ui-demo.mjs";

const scope = {
  fallbackStageId: "10000000-0000-4000-8000-000000000001",
  now: new Date("2026-08-25T12:00:00.000Z"),
  pipelineId: "20000000-0000-4000-8000-000000000001",
  stageIds: {
    contacted: "10000000-0000-4000-8000-000000000002",
    lost: "10000000-0000-4000-8000-000000000003",
    negotiating: "10000000-0000-4000-8000-000000000004",
    new: "10000000-0000-4000-8000-000000000005",
    qualified: "10000000-0000-4000-8000-000000000006",
    won: "10000000-0000-4000-8000-000000000007",
  },
  storeId: "30000000-0000-4000-8000-000000000001",
  tenantId: "40000000-0000-4000-8000-000000000001",
  userId: "50000000-0000-4000-8000-000000000001",
};

describe("CRM UI demo fixture", () => {
  it("builds deterministic fictional conversations with each requested media type", () => {
    const first = buildCrmUiDemoFixtures(scope);
    const second = buildCrmUiDemoFixtures(scope);

    expect(second).toEqual(first);
    expect(first.connection).toMatchObject({
      broker: "composio",
      provider: "meta_cloud",
      state: "sandbox",
      metadata: {
        dispatchEnabled: false,
        fixtureNamespace: CRM_UI_DEMO_NAMESPACE,
        officialOperation: false,
      },
    });
    expect(first.contacts).toHaveLength(10);
    expect(first.leads).toHaveLength(10);
    expect(first.cycles).toHaveLength(10);
    expect(first.messages).toHaveLength(40);
    expect(mediaCount(first, "image")).toBe(3);
    expect(mediaCount(first, "video")).toBe(2);
    expect(mediaCount(first, "audio")).toBe(2);
    expect(first.messages.every((row) => row.provider === "meta_cloud")).toBe(
      true,
    );
    expect(
      first.leads.every((row) => row.buyerEmail.endsWith("@example.test")),
    ).toBe(true);
  });

  it("derives UUIDs from both the store and fixture key", () => {
    const first = deterministicFixtureId(scope.storeId, "connection");
    const repeated = deterministicFixtureId(scope.storeId, "connection");
    const anotherStore = deterministicFixtureId(
      "30000000-0000-4000-8000-000000000002",
      "connection",
    );

    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(repeated).toBe(first);
    expect(anotherStore).not.toBe(first);
  });

  it("requires explicit scope and keeps apply staging-only", async () => {
    expect(() => parseCrmUiDemoSeedArgs(["--apply"])).toThrow("Usage:");
    expect(
      parseCrmUiDemoSeedArgs([
        `--user-id=${scope.userId}`,
        `--store-id=${scope.storeId}`,
      ]),
    ).toEqual({ apply: false, storeId: scope.storeId, userId: scope.userId });
    await expect(
      runCrmUiDemoSeed(
        { apply: true, storeId: scope.storeId, userId: scope.userId },
        { APP_ENV: "local", DATABASE_URL: "postgresql://localhost/demo" },
      ),
    ).rejects.toThrow("restricted to staging");
  });
});

function mediaCount(fixtures, type) {
  return fixtures.messages.filter((row) => row.messageType === type).length;
}
