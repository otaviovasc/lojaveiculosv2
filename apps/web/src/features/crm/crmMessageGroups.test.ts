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
});

function media(
  id: string,
  type: "IMAGE" | "VIDEO",
  providerTimestamp: string,
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
  };
}
