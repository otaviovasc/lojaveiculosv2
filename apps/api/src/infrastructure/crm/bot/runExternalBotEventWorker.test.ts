import { expect, it, vi } from "vitest";
import { runExternalBotEventWorkerOnce } from "./runExternalBotEventWorker.js";

it("rejects signing-key mode without an outbound sender", async () => {
  await expect(
    runExternalBotEventWorkerOnce({
      eventSigningKey: "signing-key",
      outbox: {
        enqueue: vi.fn(),
        claim: vi.fn(),
        markDeadLetter: vi.fn(),
        markDelivered: vi.fn(),
        release: vi.fn(),
      },
      prepare: vi.fn(),
    }),
  ).rejects.toThrow("CRM external bot event sender is required.");
});
