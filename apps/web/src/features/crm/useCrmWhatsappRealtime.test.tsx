// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import type {
  CrmWhatsappRealtimeEvent,
  CrmWhatsappSession,
} from "./crmWhatsappTypes";
import { useCrmWhatsappRealtime } from "./useCrmWhatsappRealtime";

describe("useCrmWhatsappRealtime", () => {
  afterEach(cleanup);

  it("merges the full session and refreshes attendance counters immediately", async () => {
    let onEvent: ((event: CrmWhatsappRealtimeEvent) => void) | undefined;
    const api = {
      subscribeEvents: vi.fn(
        (input: Parameters<CrmWhatsappApi["subscribeEvents"]>[0]) => {
          onEvent = input.onEvent;
          return vi.fn();
        },
      ),
    } as unknown as CrmWhatsappApi;
    const mergeSessions = vi.fn();
    const refreshSessionCounts = vi.fn(async () => undefined);

    render(
      <Harness
        api={api}
        mergeSessions={mergeSessions}
        refreshSessionCounts={refreshSessionCounts}
      />,
    );
    await waitFor(() => expect(onEvent).toBeDefined());
    const session = createSession();

    onEvent?.({ connectionId: "connection-1", session, type: "session" });

    expect(mergeSessions).toHaveBeenCalledWith([session], {
      preserveLocalOnly: true,
      snapshotKind: "realtime",
    });
    expect(refreshSessionCounts).toHaveBeenCalledTimes(1);
  });
});

function Harness({
  api,
  mergeSessions,
  refreshSessionCounts,
}: {
  api: CrmWhatsappApi;
  mergeSessions: (sessions: CrmWhatsappSession[]) => void;
  refreshSessionCounts: () => Promise<void>;
}) {
  useCrmWhatsappRealtime({
    activeSessionId: "session-1",
    api,
    connectionId: "connection-1",
    connectionsError: null,
    mergeRealtimeMessage: vi.fn(),
    mergeSessions,
    refreshConnections: vi.fn(async () => undefined),
    refreshSessionCounts,
    refreshSessions: vi.fn(async () => undefined),
    updateRealtimeMessageStatus: vi.fn(),
  });
  return null;
}

function createSession(): CrmWhatsappSession {
  return {
    channel: "WHATSAPP",
    humanAttendanceChangedAt: "2026-08-10T12:00:00.000Z",
    humanAttendanceState: "WAITING_HUMAN",
    humanAttendanceStateVersion: 1,
    humanHandlingStartedAt: null,
    id: "session-1",
    interventionId: "intervention-1",
    status: "HUMAN_TAKEOVER",
    uuid: "session-1",
  };
}
