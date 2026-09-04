import { describe, expect, it } from "vitest";
import { formatLastMessagePreview, formatSentPreview } from "./crmSentPreview";
import type { CrmMessage } from "./crmConversationTypes";

describe("crmSentPreview", () => {
  it.each([
    ["IMAGE", "🖼️ Imagem"],
    ["VIDEO", "🎬 Vídeo"],
    ["AUDIO", "🎵 Áudio"],
    ["DOCUMENT", "📄 Documento"],
    ["STICKER", "😊 Figurinha"],
    ["LOCATION", "📍 Localização"],
    ["CONTACT", "👤 Contato"],
    ["CATALOG", "🛍️ Catálogo"],
  ] as const)("formats %s media previews", (type, expected) => {
    expect(
      formatLastMessagePreview({
        content: `[${type.toLowerCase()}]`,
        type,
      }),
    ).toBe(expected);
  });

  it("preserves captions and document filenames", () => {
    expect(
      formatSentPreview(
        createMessage("IMAGE", "[image]", {
          media: { caption: "Foto do Civic" },
        }),
      ),
    ).toBe("Eu: 🖼️ Foto do Civic");
    expect(
      formatSentPreview(
        createMessage("DOCUMENT", "[document]", {
          media: { fileName: "proposta.pdf" },
        }),
      ),
    ).toBe("Eu: 📄 proposta.pdf");
  });
});

function createMessage(
  type: CrmMessage["type"],
  content: string,
  metadata?: Record<string, unknown>,
): CrmMessage {
  return {
    content,
    createdAt: "2026-08-28T12:00:00.000Z",
    direction: "OUTBOUND",
    id: "message-1",
    ...(metadata ? { metadata } : {}),
    senderOrigin: "human_crm",
    senderType: "HUMAN",
    senderUser: { id: "user-1", name: "Otavio" },
    status: "SENT",
    type,
  };
}
