import { useCallback, useRef, useState } from "react";
import { getApiErrorRecovery } from "../../lib/apiErrors";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { asError } from "./crmWhatsappHookSupport";
import type {
  CrmWhatsappAddSessionTagInput,
  CrmWhatsappConclusionInput,
  CrmWhatsappSession,
  CrmWhatsappSessionId,
  CrmWhatsappSessionCommandResult,
} from "./crmWhatsappTypes";
import type { CrmWhatsappBulkActionDraft } from "./crmWhatsappQueueState";

type UseCrmWhatsappSessionActionsOptions = {
  api: CrmWhatsappApi;
  patchSession: (nextSession: CrmWhatsappSession) => void;
  refreshSessions: (options?: {
    preserveLocalOnly?: boolean;
    snapshotKind?: "mutation" | "poll" | "realtime" | "reconciled";
  }) => Promise<void>;
  sessions: CrmWhatsappSession[];
  setError: (error: Error | null) => void;
};

export function useCrmWhatsappSessionActions({
  api,
  patchSession,
  refreshSessions,
  sessions,
  setError,
}: UseCrmWhatsappSessionActionsOptions) {
  const [hasRetryableSessionAction, setHasRetryableSessionAction] =
    useState(false);
  const [isMutatingSession, setIsMutatingSession] = useState(false);
  const [pendingSessionActions, setPendingSessionActions] = useState<
    ReadonlySet<string>
  >(new Set());
  const inFlightRef = useRef(new Map<string, Promise<boolean>>());
  const retryActionRef = useRef<(() => Promise<boolean>) | null>(null);

  const clearRetryAction = useCallback(() => {
    retryActionRef.current = null;
    setHasRetryableSessionAction(false);
  }, []);

  const runSessionAction = useCallback(
    (
      sessionId: CrmWhatsappSessionId,
      actionName: string,
      action: () => Promise<CrmWhatsappSessionCommandResult>,
      fallback: CrmWhatsappSession,
      silent = false,
    ) => {
      const flightKey = `${sessionId}:${actionName}`;
      const existing = inFlightRef.current.get(flightKey);
      if (existing) return existing;
      async function execute(): Promise<boolean> {
        setError(null);
        try {
          const response = await action();
          patchSession(response.session ?? fallback);
          await refreshSessions({ preserveLocalOnly: true });
          clearRetryAction();
          return true;
        } catch (caught) {
          const error = asError(caught);
          const canRetry = getApiErrorRecovery(error)?.kind === "retry";
          if (silent) {
            if (canRetry) {
              try {
                const response = await action();
                patchSession(response.session);
                return true;
              } catch {
                // Background read reconciliation remains silent.
              }
            }
            void refreshSessions({
              preserveLocalOnly: true,
              snapshotKind: "reconciled",
            }).catch(() => undefined);
            return false;
          }
          retryActionRef.current = canRetry ? execute : null;
          setHasRetryableSessionAction(canRetry);
          setError(error);
          return false;
        }
      }
      patchSession(fallback);
      setPendingSessionActions((current) => new Set(current).add(flightKey));
      const promise = execute().finally(() => {
        inFlightRef.current.delete(flightKey);
        setPendingSessionActions((current) => {
          const next = new Set(current);
          next.delete(flightKey);
          return next;
        });
      });
      inFlightRef.current.set(flightKey, promise);
      return promise;
    },
    [clearRetryAction, patchSession, refreshSessions, setError],
  );

  const runBulkSessionAction = useCallback(
    (action: () => Promise<unknown>) => {
      async function execute(): Promise<boolean> {
        setError(null);
        setIsMutatingSession(true);
        try {
          await action();
          await refreshSessions({ preserveLocalOnly: true });
          clearRetryAction();
          return true;
        } catch (caught) {
          const error = asError(caught);
          const canRetry = getApiErrorRecovery(error)?.kind === "retry";
          retryActionRef.current = canRetry ? execute : null;
          setHasRetryableSessionAction(canRetry);
          setError(error);
          return false;
        } finally {
          setIsMutatingSession(false);
        }
      }

      return execute();
    },
    [clearRetryAction, refreshSessions, setError],
  );

  const retryLastSessionAction = useCallback(
    () => retryActionRef.current?.() ?? Promise.resolve(false),
    [],
  );
  const isSessionActionPending = useCallback(
    (sessionId: CrmWhatsappSessionId, actionName: string) => {
      const prefix = `${sessionId}:`;
      return [...pendingSessionActions].some((key) => {
        if (!key.startsWith(prefix)) return false;
        const pendingAction = key.slice(prefix.length);
        return actionName === "tag"
          ? pendingAction === "add-tag" ||
              pendingAction.startsWith("remove-tag:")
          : pendingAction === actionName;
      });
    },
    [pendingSessionActions],
  );

  const assignSession = useCallback(
    (sessionId: CrmWhatsappSessionId, assignedUserId: string | null) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) return Promise.resolve(false);
      const commandId = createCommandId();
      return runSessionAction(
        sessionId,
        "assign",
        () =>
          api.assignSession(sessionId, {
            assignedUserId,
            commandId,
          }),
        {
          ...session,
          assignedMember: assignedUserId
            ? (session.assignedMember ?? null)
            : null,
          assignedUserId: assignedUserId,
        },
      );
    },
    [api, runSessionAction, sessions],
  );

  const closeSession = useCallback(
    (sessionId: CrmWhatsappSessionId) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) return Promise.resolve(false);
      const commandId = createCommandId();
      return runSessionAction(
        sessionId,
        "close",
        () =>
          api.closeSession(sessionId, {
            commandId,
          }),
        {
          ...session,
          status: "COMPLETED",
        },
      );
    },
    [api, runSessionAction, sessions],
  );

  const concludeSession = useCallback(
    (sessionId: CrmWhatsappSessionId, input: CrmWhatsappConclusionInput) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) return Promise.resolve(false);
      return runSessionAction(
        sessionId,
        "conclude",
        () => api.concludeSession(sessionId, input),
        { ...session, status: "COMPLETED" },
      );
    },
    [api, runSessionAction, sessions],
  );

  const toggleIntervention = useCallback(
    (sessionId: CrmWhatsappSessionId, enabled: boolean) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) return Promise.resolve(false);
      const commandId = createCommandId();
      return runSessionAction(
        sessionId,
        "intervention",
        () =>
          api.interveneSession(sessionId, {
            commandId,
            enabled,
          }),
        {
          ...session,
          status: enabled ? "HUMAN_TAKEOVER" : "MINIBOT_ACTIVE",
        },
      );
    },
    [api, runSessionAction, sessions],
  );

  const markSessionRead = useCallback(
    (sessionId: CrmWhatsappSessionId, options?: { silent?: boolean }) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) return Promise.resolve(false);
      const commandId = createCommandId();
      return runSessionAction(
        sessionId,
        "read",
        () =>
          api.markSessionRead(sessionId, {
            commandId,
          }),
        {
          ...session,
          lastReadAt: new Date().toISOString(),
          unreadCount: 0,
        },
        options?.silent === true,
      );
    },
    [api, runSessionAction, sessions],
  );

  const markSessionUnread = useCallback(
    (sessionId: CrmWhatsappSessionId) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) return Promise.resolve(false);
      const commandId = createCommandId();
      return runSessionAction(
        sessionId,
        "unread",
        () =>
          api.markSessionUnread(sessionId, {
            commandId,
          }),
        {
          ...session,
          lastReadAt: null,
          unreadCount: Math.max(1, session.unreadCount ?? 0),
        },
      );
    },
    [api, runSessionAction, sessions],
  );

  const addSessionTag = useCallback(
    async (
      sessionId: CrmWhatsappSessionId,
      input: CrmWhatsappAddSessionTagInput,
    ) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) return false;
      const name = input.name.trim();
      if (!name) return false;
      return runSessionAction(
        sessionId,
        "add-tag",
        async () => ({
          result: "applied",
          session: (await api.addSessionTag(sessionId, input)) ?? session,
        }),
        {
          ...session,
          sessionTags: [
            ...(session.sessionTags ?? []),
            {
              color: input.color ?? "var(--color-muted)",
              emoji: input.emoji ?? null,
              id: `local-${name.toLocaleLowerCase("pt-BR")}`,
              name,
            },
          ],
        },
      );
    },
    [api, runSessionAction, sessions],
  );

  const removeSessionTag = useCallback(
    async (sessionId: CrmWhatsappSessionId, tagId: string) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) return false;
      return runSessionAction(
        sessionId,
        `remove-tag:${tagId}`,
        async () => ({
          result: "applied",
          session: (await api.removeSessionTag(sessionId, tagId)) ?? session,
        }),
        {
          ...session,
          sessionTags: (session.sessionTags ?? []).filter(
            (tag) => tag.id !== tagId,
          ),
        },
      );
    },
    [api, runSessionAction, sessions],
  );

  const bulkAssignSessions = useCallback(
    (sessionIds: CrmWhatsappSessionId[], assignedUserId: string | null) =>
      runBulkSessionAction(() =>
        Promise.all(
          sessions
            .filter((session) => sessionIds.includes(session.id))
            .map((session) =>
              api.assignSession(session.id, {
                assignedUserId,
                commandId: createCommandId(),
              }),
            ),
        ),
      ),
    [api, runBulkSessionAction, sessions],
  );

  const bulkCloseSessions = useCallback(
    (sessionIds: CrmWhatsappSessionId[]) =>
      runBulkSessionAction(() =>
        Promise.all(
          sessions
            .filter((session) => sessionIds.includes(session.id))
            .map((session) =>
              api.concludeSession(session.id, {
                commandId: createCommandId(),
                outcome: "follow_up",
              }),
            ),
        ),
      ),
    [api, runBulkSessionAction, sessions],
  );

  const bulkMarkSessionsRead = useCallback(
    (sessionIds: CrmWhatsappSessionId[]) =>
      runBulkSessionAction(() =>
        Promise.all(
          sessions
            .filter((session) => sessionIds.includes(session.id))
            .map((session) =>
              api.markSessionRead(session.id, {
                commandId: createCommandId(),
              }),
            ),
        ),
      ),
    [api, runBulkSessionAction, sessions],
  );

  const bulkMarkSessionsUnread = useCallback(
    (sessionIds: CrmWhatsappSessionId[]) =>
      runBulkSessionAction(() =>
        Promise.all(
          sessions
            .filter((session) => sessionIds.includes(session.id))
            .map((session) =>
              api.markSessionUnread(session.id, {
                commandId: createCommandId(),
              }),
            ),
        ),
      ),
    [api, runBulkSessionAction, sessions],
  );

  const bulkApplySessions = useCallback(
    (sessionIds: CrmWhatsappSessionId[], draft: CrmWhatsappBulkActionDraft) =>
      runBulkSessionAction(async () => {
        await Promise.all(
          sessions
            .filter((session) => sessionIds.includes(session.id))
            .map(async (session) => {
              if (draft.assignedUserId !== undefined) {
                await api.assignSession(session.id, {
                  assignedUserId: draft.assignedUserId,
                  commandId: createCommandId(),
                });
              }
              if (draft.tag) await api.addSessionTag(session.id, draft.tag);
              if (draft.readState === "read") {
                await api.markSessionRead(session.id, {
                  commandId: createCommandId(),
                });
              } else if (draft.readState === "unread") {
                await api.markSessionUnread(session.id, {
                  commandId: createCommandId(),
                });
              }
              if (draft.close) {
                await api.concludeSession(session.id, {
                  commandId: createCommandId(),
                  outcome: "follow_up",
                });
              }
            }),
        );
      }),
    [api, runBulkSessionAction, sessions],
  );

  return {
    actions: {
      addSessionTag,
      assignSession,
      bulkAssignSessions,
      bulkApplySessions,
      bulkCloseSessions,
      bulkMarkSessionsRead,
      bulkMarkSessionsUnread,
      closeSession,
      concludeSession,
      markSessionRead,
      markSessionUnread,
      removeSessionTag,
      toggleIntervention,
    },
    hasRetryableSessionAction,
    isMutatingSession,
    isConcludingSession: [...pendingSessionActions].some((key) =>
      key.endsWith(":conclude"),
    ),
    isSessionActionPending,
    pendingSessionActions,
    retryLastSessionAction,
  };
}

function createCommandId() {
  return crypto.randomUUID();
}
