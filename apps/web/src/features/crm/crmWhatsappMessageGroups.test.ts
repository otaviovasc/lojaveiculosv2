import { describe, expect, it } from "vitest";
import { groupMessagesForDisplay } from "./crmWhatsappMessageGroups";
import type { WhatsappMessageView } from "./crmWhatsappModel";

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
});

function media(
  id: string,
  type: "IMAGE" | "VIDEO",
  providerTimestamp: string,
): WhatsappMessageView {
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
