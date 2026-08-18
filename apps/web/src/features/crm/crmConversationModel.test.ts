import { describe, expect, it } from "vitest";
import {
  formatContactInitials,
  formatMessageTime,
  formatRelativeSessionTime,
  getSenderOriginLabel,
  mergeMessagesFromServer,
  mergeCyclesFromServer,
} from "./crmConversationModel";
import type { CrmMessage, CrmConversationCycle } from "./crmConversationTypes";

describe("crmModel", () => {
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

  it("does not regress attendance when an older realtime cycle arrives", () => {
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

    expect(mergeCyclesFromServer([current], [stale])[0]).toMatchObject({
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

    expect(mergeCyclesFromServer([current], [cleared])[0]).toMatchObject({
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

    expect(mergeCyclesFromServer([current], [stale])[0]).toBe(current);
  });

  it("accepts an authoritative mutation snapshot despite a lower revision", () => {
    const current = createSession({ revision: 8, status: "ACTIVE" });
    const authoritative = createSession({
      revision: 7,
      status: "HUMAN_TAKEOVER",
    });

    expect(
      mergeCyclesFromServer([current], [authoritative], {
        snapshotKind: "mutation",
      })[0],
    ).toBe(authoritative);
  });

  it("does not let an older reconciled list overwrite a realtime revision", () => {
    const realtime = createSession({
      assignedUserId: "user-current",
      customerDisplayName: "Nome atualizado",
      revision: 8,
    });
    const olderList = createSession({
      assignedUserId: null,
      customerDisplayName: "Nome antigo",
      revision: 7,
    });

    expect(
      mergeCyclesFromServer([realtime], [olderList], {
        snapshotKind: "reconciled",
      })[0],
    ).toBe(realtime);
  });

  it("prunes inaccessible reconciled conversationCycles without dropping pagination misses", () => {
    const inaccessible = createSession({
      assignedUserId: "user-other",
      id: "cycle-revoked",
    });
    const paginationMiss = createSession({
      assignedUserId: "user-current",
      id: "cycle-next-page",
    });

    expect(
      mergeCyclesFromServer([inaccessible, paginationMiss], [], {
        preserveLocalOnly: true,
        pruneLocalOnly: (cycle) => cycle.assignedUserId !== "user-current",
        snapshotKind: "reconciled",
      }),
    ).toEqual([paginationMiss]);
  });

  it("labels messages sent directly from a channel clearly", () => {
    expect(
      getSenderOriginLabel(
        createMessage({
          direction: "OUTBOUND",
          senderOrigin: "human_channel",
          senderType: "HUMAN",
        }),
      ),
    ).toBe("Enviado diretamente pelo canal");
  });
});

function createSession(
  input: Partial<CrmConversationCycle> = {},
): CrmConversationCycle {
  return {
    channel: "whatsapp",
    id: "cycle-1",
    lastMessageAt: "2026-07-03T12:00:00.000Z",
    status: "HUMAN_TAKEOVER",
    ...input,
  };
}

function createMessage(
  input: Partial<CrmMessage> & { clientId?: string },
): CrmMessage & { clientId?: string } {
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
