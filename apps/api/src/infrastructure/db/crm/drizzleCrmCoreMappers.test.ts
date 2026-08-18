import { describe, expect, it } from "vitest";
import type {
  contactIdentities,
  crmChannelConnections,
} from "@lojaveiculosv2/db";
import { mapConnection, mapIdentity } from "./drizzleCrmCoreMappers.js";

const baseRow: typeof crmChannelConnections.$inferSelect = {
  authorizationId: null,
  broker: "direct",
  channel: "whatsapp",
  createdAt: new Date("2026-08-12T00:00:00.000Z"),
  displayName: "Z-API",
  externalConnectionId: null,
  externalInstanceId: null,
  id: "00000000-0000-4000-8000-000000000001",
  metadata: {},
  provider: "zapi",
  revision: 0,
  state: "active",
  storeId: "00000000-0000-4000-8000-000000000002",
  tenantId: "00000000-0000-4000-8000-000000000003",
  updatedAt: new Date("2026-08-12T00:00:00.000Z"),
  webhookUrl: null,
};

describe("CRM core connection projection", () => {
  it("does not infer capabilities merely from active/provider state", () => {
    expect(mapConnection(baseRow).capabilities).toEqual({
      inbound: false,
      outbound: false,
      templates: false,
    });
  });

  it("projects only server-verified persisted capabilities", () => {
    expect(
      mapConnection({
        ...baseRow,
        metadata: {
          capabilities: { inbound: true, outbound: true, templates: false },
        },
      }).capabilities,
    ).toEqual({ inbound: true, outbound: true, templates: false });
  });
});

describe("CRM core identity projection", () => {
  it("projects only the persisted candidate contact ids supplied by the repository", () => {
    const row: typeof contactIdentities.$inferSelect = {
      channel: null,
      contactId: null,
      createdAt: new Date("2026-08-12T00:00:00.000Z"),
      id: "00000000-0000-4000-8000-000000000010",
      identityKind: "phone",
      normalizedValue: "+5511999999999",
      observedAt: new Date("2026-08-12T00:00:00.000Z"),
      provider: null,
      revision: 0,
      state: "candidate",
      storeId: "00000000-0000-4000-8000-000000000002",
      supersededByIdentityId: null,
      tenantId: "00000000-0000-4000-8000-000000000003",
      updatedAt: new Date("2026-08-12T00:00:00.000Z"),
      verifiedAt: null,
    };
    const candidateId = "00000000-0000-4000-8000-000000000011";
    expect(mapIdentity(row, [candidateId])).toMatchObject({
      candidateContactIds: [candidateId],
      contactId: null,
      verification: "candidate",
    });
  });
});
