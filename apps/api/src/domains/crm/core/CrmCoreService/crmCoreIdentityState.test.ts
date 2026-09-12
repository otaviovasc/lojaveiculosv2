import { describe, expect, it } from "vitest";
import { createMemoryCrmCoreRepository } from "../../testSupportCore.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import {
  createContactIdentity,
  createCrmCore,
  disputeContactIdentity,
  verifyContactIdentity,
} from "./index.js";

describe("CRM core identity state", () => {
  it("auto-links only verified or uniquely normalized identities and supports dispute", async () => {
    const repository = createMemoryCrmCoreRepository();
    const first = await contact(repository, "First");
    const second = await contact(repository, "Second");
    const observed = await createContactIdentity(
      context(),
      { kind: "email", value: "same@example.com" },
      repository,
    );
    expect(observed.contactId).toBeNull();
    const candidate = await createContactIdentity(
      context(),
      {
        contactId: first.id,
        kind: "email",
        value: " SAME@example.com ",
      },
      repository,
    );
    await verifyContactIdentity(
      context(),
      decision(candidate.id, candidate.revision, first.id),
      repository,
    );
    const linked = await createContactIdentity(
      context(),
      {
        contactId: second.id,
        kind: "email",
        value: "same@example.com",
      },
      repository,
    );
    expect(linked.contactId).toBe(first.id);
    const disputed = await disputeContactIdentity(
      context(),
      decision(linked.id, linked.revision),
      repository,
    );
    expect(disputed).toMatchObject({
      contactId: null,
      verification: "disputed",
    });
    const collisionCandidate = await createContactIdentity(
      context(),
      {
        contactId: second.id,
        kind: "email",
        value: "same@example.com",
      },
      repository,
    );
    const collision = await verifyContactIdentity(
      context(),
      decision(collisionCandidate.id, collisionCandidate.revision, second.id),
      repository,
    );
    expect(collision).toMatchObject({
      contactId: null,
      verification: "disputed",
    });
    expect(collision.candidateContactIds).toEqual(
      expect.arrayContaining([first.id, second.id]),
    );
  });
});

function context() {
  return createServiceContext({
    actor: { id: "user-a", kind: "user" },
    entitlements: ["crm"],
    permissions: [
      "crm.access",
      "crm.contact_identity.dispute",
      "crm.contact_identity.verify",
      "crm.manage",
    ],
    request: { requestId: "identity-state" },
    storeId: "store-a",
    tenantId: "tenant-a",
  });
}

function contact(
  repository: ReturnType<typeof createMemoryCrmCoreRepository>,
  displayName: string,
) {
  return createCrmCore(
    context(),
    "contacts",
    { disputed: false, displayName, mergedIntoContactId: null },
    repository,
  );
}

function decision(
  identityId: string,
  expectedRevision: number,
  contactId?: string,
) {
  return {
    ...(contactId ? { contactId } : {}),
    evidence: "crm-user-confirmation",
    expectedRevision,
    identityId,
    occurredAt: new Date("2026-08-12T12:00:00.000Z"),
    source: "crm_operator",
  };
}
