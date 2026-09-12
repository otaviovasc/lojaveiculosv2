import { describe, expect, it } from "vitest";
import { groupMessagesForDisplay } from "./crmMessageGroups";
import type { CrmMessageView } from "./crmConversationModel";

describe("groupMessagesForDisplay", () => {
  it("groups consecutive image and video messages by side within one minute", () => {
    const groups = groupMessagesForDisplay([
      media("1", "IMAGE", "2026-07-03T12:00:00.000Z"),
      media("2", "VIDEO", "2026-07-03T12:00:45.000Z"),
      media("3", "IMAGE", "2026-07-03T12:02:00.000Z"),
      {
        ...media("4", "IMAGE", "2026-07-03T12:02:20.000Z"),
        direction: "INBOUND",
      },
    ]);

    expect(groups).toMatchObject([
      { kind: "media", messages: [{ id: "1" }, { id: "2" }] },
      { kind: "single", message: { id: "3" } },
      { kind: "single", message: { id: "4" } },
    ]);
  });

  it("keeps replied-to media separate so its quote context is rendered", () => {
    const replied = {
      ...media("2", "IMAGE", "2026-07-03T12:00:20.000Z"),
      metadata: {
        replyTo: { content: "Qual foto?", id: "question-1" },
      },
    };

    const groups = groupMessagesForDisplay([
      media("1", "IMAGE", "2026-07-03T12:00:00.000Z"),
      replied,
      media("3", "VIDEO", "2026-07-03T12:00:40.000Z"),
    ]);

    expect(groups).toMatchObject([
      { kind: "single", message: { id: "1" } },
      { kind: "single", message: { id: "2" } },
      { kind: "single", message: { id: "3" } },
    ]);
  });

  it("caps groups at four messages so every rendered item keeps an anchor", () => {
    const groups = groupMessagesForDisplay(
      ["1", "2", "3", "4", "5"].map((id, index) =>
        media(id, "IMAGE", `2026-07-03T12:00:0${index}.000Z`),
      ),
    );

    expect(groups).toMatchObject([
      {
        kind: "media",
        messages: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }],
      },
      { kind: "single", message: { id: "5" } },
    ]);
  });

  it("keeps media from different CRM attendants separate in the same minute", () => {
    const groups = groupMessagesForDisplay([
      crmHumanMedia("1", "user-1", "2026-07-03T12:00:00.000Z"),
      crmHumanMedia("2", "user-2", "2026-07-03T12:00:20.000Z"),
    ]);

    expect(groups).toMatchObject([
      { kind: "single", message: { id: "1" } },
      { kind: "single", message: { id: "2" } },
    ]);
  });

  it("groups media from the same CRM attendant by canonical user id", () => {
    const groups = groupMessagesForDisplay([
      crmHumanMedia("1", "user-1", "2026-07-03T12:00:00.000Z", "Otavio"),
      crmHumanMedia(
        "2",
        "user-1",
        "2026-07-03T12:00:20.000Z",
        "Otavio atualizado",
      ),
    ]);

    expect(groups).toMatchObject([
      { kind: "media", messages: [{ id: "1" }, { id: "2" }] },
    ]);
  });

  it("keeps direct-channel media together without mixing it with CRM media", () => {
    const groups = groupMessagesForDisplay([
      media("1", "IMAGE", "2026-07-03T12:00:00.000Z", {
        senderOrigin: "human_channel",
      }),
      media("2", "VIDEO", "2026-07-03T12:00:20.000Z", {
        senderOrigin: "human_channel",
      }),
      crmHumanMedia("3", "user-1", "2026-07-03T12:00:30.000Z"),
    ]);

    expect(groups).toMatchObject([
      { kind: "media", messages: [{ id: "1" }, { id: "2" }] },
      { kind: "single", message: { id: "3" } },
    ]);
  });

  it("preserves legitimate AI, system, and inbound customer grouping", () => {
    const groups = groupMessagesForDisplay([
      media("ai-1", "IMAGE", "2026-07-03T12:00:00.000Z", {
        senderOrigin: "external_bot",
        senderType: "AI",
      }),
      media("ai-2", "VIDEO", "2026-07-03T12:00:10.000Z", {
        senderOrigin: "external_bot",
        senderType: "AI",
      }),
      media("system-1", "IMAGE", "2026-07-03T12:00:20.000Z", {
        senderOrigin: "system",
        senderType: "SYSTEM",
      }),
      media("system-2", "VIDEO", "2026-07-03T12:00:30.000Z", {
        senderOrigin: "system",
        senderType: "SYSTEM",
      }),
      media("customer-1", "IMAGE", "2026-07-03T12:00:40.000Z", {
        direction: "INBOUND",
        senderOrigin: "customer",
        senderType: "CUSTOMER",
      }),
      media("customer-2", "VIDEO", "2026-07-03T12:00:50.000Z", {
        direction: "INBOUND",
        senderOrigin: "customer",
        senderType: "CUSTOMER",
      }),
    ]);

    expect(groups).toMatchObject([
      { kind: "media", messages: [{ id: "ai-1" }, { id: "ai-2" }] },
      {
        kind: "media",
        messages: [{ id: "system-1" }, { id: "system-2" }],
      },
      {
        kind: "media",
        messages: [{ id: "customer-1" }, { id: "customer-2" }],
      },
    ]);
  });

  it("does not group legacy CRM-human media without trusted identity", () => {
    const groups = groupMessagesForDisplay([
      media("1", "IMAGE", "2026-07-03T12:00:00.000Z", {
        senderOrigin: "human_crm",
      }),
      media("2", "VIDEO", "2026-07-03T12:00:20.000Z", {
        senderOrigin: "human_crm",
      }),
    ]);

    expect(groups).toMatchObject([
      { kind: "single", message: { id: "1" } },
      { kind: "single", message: { id: "2" } },
    ]);
  });

  it("preserves unattributed legacy grouping without assigning a CRM user", () => {
    const groups = groupMessagesForDisplay([
      media("1", "IMAGE", "2026-07-03T12:00:00.000Z"),
      media("2", "VIDEO", "2026-07-03T12:00:20.000Z"),
    ]);

    expect(groups).toMatchObject([
      { kind: "media", messages: [{ id: "1" }, { id: "2" }] },
    ]);
  });
});

function crmHumanMedia(
  id: string,
  senderUserId: string,
  providerTimestamp: string,
  senderName = `User ${senderUserId}`,
) {
  return media(id, "IMAGE", providerTimestamp, {
    senderOrigin: "human_crm",
    senderUser: { id: senderUserId, name: senderName },
  });
}

function media(
  id: string,
  type: "IMAGE" | "VIDEO",
  providerTimestamp: string,
  overrides: Partial<CrmMessageView> = {},
): CrmMessageView {
  return {
    content: `[${type.toLowerCase()}]`,
    createdAt: providerTimestamp,
    direction: "OUTBOUND",
    id,
    mediaUrl: `https://cdn.local/${id}`,
    providerTimestamp,
    senderType: "HUMAN",
    status: "SENT",
    type,
    ...overrides,
  };
}
