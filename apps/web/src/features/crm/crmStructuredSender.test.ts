import { describe, expect, it, vi } from "vitest";
import type { SetStateAction } from "react";
import { AppApiError } from "../../lib/apiErrors";
import { createOptimisticStructuredMessage } from "./crmConversationModel";
import {
  retryOptimisticStructuredMessage,
  sendOptimisticStructuredMessage,
} from "./crmStructuredSender";
import type { CrmMessageView } from "./crmConversationModel";

describe("sendOptimisticStructuredMessage", () => {
  it("keeps an indeterminate bubble with its stable idempotency key", async () => {
    let messages: CrmMessageView[] = [];
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
          channel: "whatsapp",
          id: "cycle-1",
          status: "ACTIVE",
        },
        mergeCycles: vi.fn(),
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

  it("retries a known failure with a fresh idempotency key in the same bubble", async () => {
    let messages: CrmMessageView[] = [];
    const optimistic = createOptimisticStructuredMessage({
      content: "Localizacao",
      type: "LOCATION",
    });
    const request = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error("known failure"), { status: 422 }),
      )
      .mockImplementationOnce(async (idempotencyKey: string) => ({
        ...optimistic,
        clientRequestId: idempotencyKey,
        id: "server-1",
        status: "SENT" as const,
      }));
    const input = {
      activeSession: {
        channel: "whatsapp" as const,
        id: "cycle-1",
        status: "ACTIVE" as const,
      },
      mergeCycles: vi.fn(),
      optimistic,
      request,
      setError: vi.fn(),
      setIsSending: vi.fn(),
      setMessages: (update: SetStateAction<CrmMessageView[]>) => {
        messages = typeof update === "function" ? update(messages) : update;
      },
    };

    await expect(sendOptimisticStructuredMessage(input)).resolves.toBe(false);
    await expect(retryOptimisticStructuredMessage(messages[0]!)).resolves.toBe(
      true,
    );

    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1]?.[0]).not.toBe(request.mock.calls[0]?.[0]);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ id: "server-1", status: "SENT" });
  });
});
