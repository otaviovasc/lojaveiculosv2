import { describe, expect, it } from "vitest";
import { groupRecipientCandidates } from "./drizzleCrmPushRecipients.js";

const base = {
  membershipId: "membership",
  membershipStatus: "active",
  overrideAllowed: null,
  overridePermission: null,
  preferenceEnabled: null,
  role: "salesman" as const,
  subscriptionEnabled: true,
  subscriptionId: "subscription-a",
  userDeleted: false,
  userId: "user",
};

describe("Drizzle CRM push recipient mapping", () => {
  it("deduplicates subscriptions expanded by permission override joins", () => {
    expect(
      groupRecipientCandidates([
        base,
        {
          ...base,
          overrideAllowed: true,
          overridePermission: "crm.conversations.read_unassigned",
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        activeMembership: true,
        hasGlobalQueueVisibility: true,
        preferenceEnabled: true,
        subscriptionIds: ["subscription-a"],
      }),
    ]);
  });

  it("keeps suspended and deleted users ineligible", () => {
    expect(
      groupRecipientCandidates([
        { ...base, membershipStatus: "suspended", userDeleted: true },
      ])[0],
    ).toMatchObject({ activeMembership: false });
  });

  it("excludes disabled subscriptions and honors store preference", () => {
    expect(
      groupRecipientCandidates([
        {
          ...base,
          preferenceEnabled: false,
          subscriptionEnabled: false,
        },
      ])[0],
    ).toMatchObject({ preferenceEnabled: false, subscriptionIds: [] });
  });
});
