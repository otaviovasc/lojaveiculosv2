import { describe, expect, it } from "vitest";
import {
  formatContactInitials,
  formatMessageTime,
  formatRelativeSessionTime,
  getSenderOriginLabel,
  mergeMessagesFromServer,
  mergeSessionsFromServer,
  parseCrmWhatsappMessage,
  parseCrmWhatsappSession,
} from "./crmWhatsappModel";
import type {
  CrmWhatsappMessage,
  CrmWhatsappSession,
} from "./crmWhatsappTypes";

describe("crmWhatsappModel", () => {
  it("formats deterministic contact initials", () => {
    expect(formatContactInitials("Otavio Vasconcelos")).toBe("OV");
    expect(formatContactInitials("  Érica   d'Ávila ")).toBe("ÉD");
    expect(formatContactInitials("João da Silva")).toBe("JS");
    expect(formatContactInitials("Ana")).toBe("AN");
    expect(formatContactInitials(".")).toBe("?");
    expect(formatContactInitials(null)).toBe("?");
  });
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

  it("does not regress attendance when an older realtime session arrives", () => {
    const current = createSession({
      humanAttendanceChangedAt: "2026-07-03T12:05:00.000Z",
      humanAttendanceState: "IN_HUMAN_SERVICE",
      humanAttendanceStateVersion: 2,
      humanHandlingStartedAt: "2026-07-03T12:05:00.000Z",
      interventionId: "intervention-1",
      status: "HUMAN_TAKEOVER",
    });
    const stale = createSession({
      humanAttendanceChangedAt: "2026-07-03T12:04:00.000Z",
      humanAttendanceState: "WAITING_HUMAN",
      humanAttendanceStateVersion: 1,
      humanHandlingStartedAt: null,
      interventionId: "intervention-1",
      status: "ACTIVE",
    });

    expect(mergeSessionsFromServer([current], [stale])[0]).toMatchObject({
      humanAttendanceState: "IN_HUMAN_SERVICE",
      humanAttendanceStateVersion: 2,
      humanHandlingStartedAt: "2026-07-03T12:05:00.000Z",
      status: "HUMAN_TAKEOVER",
    });
  });

  it("clears a stale attendance badge when a newer tombstone arrives", () => {
    const current = createSession({
      humanAttendanceChangedAt: "2026-07-03T12:05:00.000Z",
      humanAttendanceState: "IN_HUMAN_SERVICE",
      humanAttendanceStateVersion: 2,
      humanHandlingStartedAt: "2026-07-03T12:05:00.000Z",
      interventionId: "intervention-1",
    });
    const cleared = createSession({
      humanAttendanceChangedAt: "2026-07-03T12:18:00.000Z",
      humanAttendanceState: null,
      humanAttendanceStateVersion: 3,
      humanHandlingStartedAt: null,
      interventionId: null,
      status: "ACTIVE",
    });

    expect(mergeSessionsFromServer([current], [cleared])[0]).toMatchObject({
      humanAttendanceChangedAt: "2026-07-03T12:18:00.000Z",
      humanAttendanceState: null,
      humanAttendanceStateVersion: 3,
      humanHandlingStartedAt: null,
      interventionId: null,
    });
  });

  it("rejects a lower revision even when its timestamp is newer", () => {
    const current = createSession({
      lastMessageAt: "2026-07-03T12:00:00.000Z",
      revision: 8,
      status: "HUMAN_TAKEOVER",
    });
    const stale = createSession({
      lastMessageAt: "2026-07-03T12:30:00.000Z",
      revision: 7,
      status: "ACTIVE",
    });

    expect(mergeSessionsFromServer([current], [stale])[0]).toBe(current);
  });

  it("accepts an authoritative mutation snapshot despite a lower revision", () => {
    const current = createSession({ revision: 8, status: "ACTIVE" });
    const authoritative = createSession({
      revision: 7,
      status: "HUMAN_TAKEOVER",
    });

    expect(
      mergeSessionsFromServer([current], [authoritative], {
        snapshotKind: "mutation",
      })[0],
    ).toBe(authoritative);
  });

  it("does not let an older reconciled list overwrite a realtime revision", () => {
    const realtime = createSession({
      assignedUserId: "user-current",
      buyerName: "Nome atualizado",
      revision: 8,
    });
    const olderList = createSession({
      assignedUserId: null,
      buyerName: "Nome antigo",
      revision: 7,
    });

    expect(
      mergeSessionsFromServer([realtime], [olderList], {
        snapshotKind: "reconciled",
      })[0],
    ).toBe(realtime);
  });

  it("prunes inaccessible reconciled sessions without dropping pagination misses", () => {
    const inaccessible = createSession({
      assignedUserId: "user-other",
      id: "session-revoked",
      uuid: "session-revoked",
    });
    const paginationMiss = createSession({
      assignedUserId: "user-current",
      id: "session-next-page",
      uuid: "session-next-page",
    });

    expect(
      mergeSessionsFromServer([inaccessible, paginationMiss], [], {
        preserveLocalOnly: true,
        pruneLocalOnly: (session) => session.assignedUserId !== "user-current",
        snapshotKind: "reconciled",
      }),
    ).toEqual([paginationMiss]);
  });

  it("normalizes API origin, safe numeric revision, and history coverage", () => {
    expect(
      parseCrmWhatsappSession({
        id: "session-1",
        interventionHistoryStartedAt: "2026-08-10T12:00:00.000Z",
        revision: 4,
      }),
    ).toMatchObject({
      interventionHistoryStartedAt: "2026-08-10T12:00:00.000Z",
      revision: 4,
    });
    expect(parseCrmWhatsappSession({ id: "session-2", revision: "4" })).toEqual(
      expect.objectContaining({ revision: 0 }),
    );
    expect(parseCrmWhatsappMessage({ id: "message-1" })).toEqual(
      expect.objectContaining({ senderOrigin: "unknown" }),
    );
  });

  it("labels messages sent directly from WhatsApp clearly", () => {
    expect(
      getSenderOriginLabel(
        createMessage({
          direction: "OUTBOUND",
          senderOrigin: "human_whatsapp",
          senderType: "HUMAN",
        }),
      ),
    ).toBe("Enviado diretamente pelo WhatsApp");
  });
});

function createSession(
  input: Partial<CrmWhatsappSession> = {},
): CrmWhatsappSession {
  return {
    channel: "WHATSAPP",
    id: "session-1",
    lastMessageAt: "2026-07-03T12:00:00.000Z",
    status: "HUMAN_TAKEOVER",
    uuid: "session-1",
    ...input,
  };
}

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
