import { describe, expect, it, vi } from "vitest";
import { CrmMessagingGatewayError } from "../../../domains/crm/ports/crmMessagingGateway.js";
import { externalBotEffectFixture } from "./externalBotProviderEffectExecutor.testSupport.js";
import { sendProviderCommand } from "./externalBotProviderEffectSupport.js";

describe("external bot provider media contract", () => {
  it("blocks legacy audio before any provider attempt", () => {
    const sendMedia = vi.fn();
    const effect = {
      ...externalBotEffectFixture({
        action: "message.send_media",
        payload: {
          mediaType: "audio",
          mediaUrl: "https://cdn.example.com/audio.mp3",
        },
      }),
      preparedMedia: {
        contentType: "audio/mpeg",
        originalUrl: "https://source.example.com/audio.mp3",
        publicUrl: "https://cdn.example.com/audio.mp3",
        sizeBytes: 3,
        storageKey: "crm/audio.mp3",
      },
    };

    expect(() =>
      sendProviderCommand(
        {
          sendMedia,
          sendTemplate: vi.fn(),
          sendText: vi.fn(),
        },
        effect.connection,
        effect,
      ),
    ).toThrow(CrmMessagingGatewayError);
    expect(sendMedia).not.toHaveBeenCalled();
  });
});
