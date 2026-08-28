import { describe, expect, it } from "vitest";
import type { CrmMessageView } from "./crmConversationModel";
import { reconcileCrmMessages } from "./crmMessageReconciliation";
import type { CrmMessage } from "./crmConversationTypes";

describe("reconcileCrmMessages", () => {
  it("collapses an optimistic media echo and an SSE echo by client request id", () => {
    const optimistic = message({
      clientId: "local-1",
      id: "local-1",
      mediaUrl: "blob:local",
      metadata: { idempotencyKey: "request-1" },
      status: "PENDING",
      type: "IMAGE",
    });
    const server = message({
      clientRequestId: "request-1",
      id: "server-1",
      mediaUrl: "https://media.example/image.jpg",
      status: "SENT",
      type: "IMAGE",
    });

    expect(reconcileCrmMessages([optimistic], server).messages).toEqual([
      expect.objectContaining({
        clientId: "local-1",
        id: "server-1",
        mediaUrl: "https://media.example/image.jpg",
        status: "SENT",
      }),
    ]);
  });

  it("collapses HTTP, SSE, and polling copies regardless of arrival order", () => {
    const optimistic = message({
      clientId: "local-1",
      id: "local-1",
      metadata: { idempotencyKey: "request-1" },
      status: "PENDING",
    });
    const sse = message({
      clientRequestId: "request-1",
      externalId: "provider-1",
      id: "server-1",
      status: "DELIVERED",
    });
    const http = message({
      clientRequestId: "request-1",
      externalId: "provider-1",
      id: "server-1",
      status: "SENT",
    });
    const polling = { ...sse, status: "READ" as const };

    const afterSse = reconcileCrmMessages([optimistic], sse).messages;
    const afterHttp = reconcileCrmMessages(afterSse, http).messages;
    const afterPolling = reconcileCrmMessages(afterHttp, [polling]).messages;

    expect(afterPolling).toHaveLength(1);
    expect(afterPolling[0]).toMatchObject({ id: "server-1", status: "READ" });
  });

  it("applies a status buffered before its message arrives", () => {
    const server = message({ id: "server-late", status: "SENT" });

    const result = reconcileCrmMessages([], server, [
      { messageId: "server-late", status: "DELIVERED" },
    ]);

    expect(result.messages[0]?.status).toBe("DELIVERED");
    expect(result.pendingStatusUpdates).toEqual([]);
  });

  it("keeps unmatched status buffered", () => {
    const result = reconcileCrmMessages(
      [],
      [],
      [{ messageId: "server-late", status: "READ" }],
    );

    expect(result.pendingStatusUpdates).toEqual([
      { messageId: "server-late", status: "READ" },
    ]);
  });
});

function message(
  input: Partial<CrmMessageView> & { clientRequestId?: string },
): CrmMessage {
  return {
    content: "Mensagem",
    createdAt: "2026-08-28T12:00:00.000Z",
    direction: "OUTBOUND",
    id: "message-1",
    senderType: "HUMAN",
    status: "SENT",
    type: "TEXT",
    ...input,
  } as CrmMessage;
}
