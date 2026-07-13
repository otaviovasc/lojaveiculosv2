import { describe, expect, it } from "vitest";
import {
  formatMessageTime,
  formatRelativeSessionTime,
  mergeMessagesFromServer,
} from "./crmWhatsappModel";
import type { CrmWhatsappMessage } from "./crmWhatsappTypes";

describe("crmWhatsappModel", () => {
  it("formats conversation timestamps with the Brazilian 24-hour locale", () => {
    const message = createMessage({ createdAt: "2026-07-03T12:00:00.000Z" });

    expect(formatMessageTime(message)).toMatch(/^\d{2}:\d{2}$/);
    expect(formatRelativeSessionTime(message.createdAt)).toMatch(
      /^\d{2}\/\d{2}$/,
    );
  });

  it("preserves local sent echoes until the server returns the message", () => {
    const localEcho = createMessage({
      clientId: "local-catalog",
      content: "Catalogo da loja",
      direction: "OUTBOUND",
      id: "catalog-response",
      status: "SENT",
      type: "CATALOG",
    });
    const inbound = createMessage({
      content: "Ola",
      direction: "INBOUND",
      id: "inbound-1",
      type: "TEXT",
    });

    expect(mergeMessagesFromServer([inbound, localEcho], [inbound])).toEqual([
      inbound,
      localEcho,
    ]);
  });

  it("drops a local echo once an equivalent server message arrives", () => {
    const localEcho = createMessage({
      clientId: "local-location",
      content: "Loja",
      direction: "OUTBOUND",
      id: "location-response",
      status: "SENT",
      type: "LOCATION",
    });
    const serverEcho = createMessage({
      content: "Loja",
      direction: "OUTBOUND",
      id: "location-db",
      status: "SENT",
      type: "LOCATION",
    });

    expect(mergeMessagesFromServer([localEcho], [serverEcho])).toEqual([
      serverEcho,
    ]);
  });
});

function createMessage(
  input: Partial<CrmWhatsappMessage> & { clientId?: string },
): CrmWhatsappMessage & { clientId?: string } {
  return {
    content: "Ola",
    createdAt: "2026-07-03T12:00:00.000Z",
    direction: "INBOUND",
    id: "message-1",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    type: "TEXT",
    ...input,
  };
}
