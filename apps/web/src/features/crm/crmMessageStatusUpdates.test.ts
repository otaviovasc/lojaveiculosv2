import { describe, expect, it } from "vitest";
import type { CrmMessageView } from "./crmConversationModel";
import {
  applyRealtimeMessageStatus,
  bufferRealtimeMessageStatus,
  mergeCrmMessageStatus,
  type RealtimeMessageStatusUpdate,
} from "./crmMessageStatusUpdates";

describe("CRM message status reconciliation", () => {
  it("never regresses the delivery chain", () => {
    expect(mergeCrmMessageStatus("READ", "SENT")).toBe("READ");
    expect(mergeCrmMessageStatus("DELIVERED", "PENDING")).toBe("DELIVERED");
    expect(mergeCrmMessageStatus("SENT", "READ")).toBe("READ");
  });

  it("bounds early status buffering while retaining the most recent echoes", () => {
    const buffered = Array.from({ length: 3 }, (_, index) => ({
      messageId: `message-${index + 1}`,
      status: "DELIVERED" as const,
    })).reduce<RealtimeMessageStatusUpdate[]>(
      (current, update) => bufferRealtimeMessageStatus(current, update, 2),
      [],
    );

    expect(buffered.map((update) => update.messageId)).toEqual([
      "message-2",
      "message-3",
    ]);
  });

  it("only replaces uncertain outcomes with positive provider evidence", () => {
    expect(mergeCrmMessageStatus("INDETERMINATE", "FAILED")).toBe(
      "INDETERMINATE",
    );
    expect(mergeCrmMessageStatus("FAILED", "INDETERMINATE")).toBe("FAILED");
    expect(mergeCrmMessageStatus("FAILED", "PROVIDER_UNKNOWN")).toBe("FAILED");
    expect(mergeCrmMessageStatus("INDETERMINATE", "DELIVERED")).toBe(
      "DELIVERED",
    );
    expect(mergeCrmMessageStatus("FAILED", "SENT")).toBe("SENT");
    expect(mergeCrmMessageStatus("READ", "FAILED")).toBe("READ");
    expect(mergeCrmMessageStatus("PENDING", "FAILED")).toBe("FAILED");
    expect(mergeCrmMessageStatus("FAILED", "PENDING")).toBe("FAILED");
  });

  it("returns the original list when an update cannot be applied", () => {
    const messages = [message({ id: "known" })];
    expect(
      applyRealtimeMessageStatus(messages, {
        messageId: "unknown",
        status: "READ",
      }),
    ).toBe(messages);
  });

  it("matches provider external ids without matching empty ids", () => {
    const messages = [message({ externalId: "provider-1", id: "server-1" })];
    expect(
      applyRealtimeMessageStatus(messages, {
        messageId: "provider-1",
        status: "READ",
      })[0]?.status,
    ).toBe("READ");
  });
});

function message(input: Partial<CrmMessageView> = {}): CrmMessageView {
  return {
    content: "Mensagem",
    createdAt: "2026-08-28T12:00:00.000Z",
    direction: "OUTBOUND",
    id: "message-1",
    senderType: "HUMAN",
    status: "SENT",
    type: "TEXT",
    ...input,
  };
}
