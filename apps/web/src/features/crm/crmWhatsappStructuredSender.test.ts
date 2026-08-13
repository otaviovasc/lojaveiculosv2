import { describe, expect, it, vi } from "vitest";
import { AppApiError } from "../../lib/apiErrors";
import { createOptimisticStructuredMessage } from "./crmWhatsappModel";
import { sendOptimisticStructuredMessage } from "./crmWhatsappStructuredSender";
import type { WhatsappMessageView } from "./crmWhatsappModel";

describe("sendOptimisticStructuredMessage", () => {
  it("keeps an indeterminate bubble with its stable idempotency key", async () => {
    let messages: WhatsappMessageView[] = [];
    const optimistic = createOptimisticStructuredMessage({
      content: "Catalogo",
      type: "CATALOG",
    });
    const request = vi.fn(async () => {
      throw new AppApiError({
        code: "PROVIDER_RESULT_INDETERMINATE",
        message: "unknown result",
        status: 502,
      });
    });

    await expect(
      sendOptimisticStructuredMessage({
        activeSession: {
          channel: "WHATSAPP",
          id: "session-1",
          status: "ACTIVE",
          uuid: "session-1",
        },
        mergeSessions: vi.fn(),
        optimistic,
        request,
        setError: vi.fn(),
        setIsSending: vi.fn(),
        setMessages: (update) => {
          messages = typeof update === "function" ? update(messages) : update;
        },
      }),
    ).resolves.toBe(false);

    expect(request).toHaveBeenCalledWith(optimistic.clientId);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      clientId: optimistic.clientId,
      status: "INDETERMINATE",
    });
    expect(messages[0]?.metadata).toMatchObject({
      idempotencyKey: optimistic.clientId,
    });
  });
});
