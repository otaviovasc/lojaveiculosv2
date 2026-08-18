import { useCallback, useRef, useState } from "react";
import { getApiErrorRecovery } from "../../lib/apiErrors";
import type { CrmConversationApi } from "./crmConversationApi";
import { asError } from "./crmConversationHookSupport";
import type {
  CrmAddConversationCycleTagInput,
  CrmConclusionInput,
  CrmConversationCycle,
  CrmConversationCycleId,
  CrmConversationCycleCommandResult,
} from "./crmConversationTypes";
import type { CrmBulkActionDraft } from "./crmQueueState";

type UseCrmConversationCycleActionsOptions = {
  api: CrmConversationApi;
  patchSession: (nextSession: CrmConversationCycle) => void;
  refreshSessions: (options?: {
    preserveLocalOnly?: boolean;
    snapshotKind?: "mutation" | "poll" | "realtime" | "reconciled";
  }) => Promise<void>;
  conversationCycles: CrmConversationCycle[];
  setError: (error: Error | null) => void;
};

export function useCrmConversationCycleActions({
  api,
  patchSession,
  refreshSessions,
  conversationCycles,
  setError,
}: UseCrmConversationCycleActionsOptions) {
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
      cycleId: CrmConversationCycleId,
      actionName: string,
      action: () => Promise<CrmConversationCycleCommandResult>,
      fallback: CrmConversationCycle,
      silent = false,
    ) => {
      const flightKey = `${cycleId}:${actionName}`;
      const existing = inFlightRef.current.get(flightKey);
      if (existing) return existing;
      async function execute(): Promise<boolean> {
        setError(null);
        try {
          const response = await action();
          patchSession(response.cycle ?? fallback);
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
                patchSession(response.cycle);
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
    (cycleId: CrmConversationCycleId, actionName: string) => {
      const prefix = `${cycleId}:`;
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

  const assignCycle = useCallback(
    (cycleId: CrmConversationCycleId, assignedUserId: string | null) => {
      const cycle = conversationCycles.find((item) => item.id === cycleId);
      if (!cycle) return Promise.resolve(false);
      const commandId = createCommandId();
      return runSessionAction(
        cycleId,
        "assign",
        () =>
          api.assignCycle(cycleId, {
            assignedUserId,
            commandId,
          }),
        {
          ...cycle,
          assignedMember: assignedUserId
            ? (cycle.assignedMember ?? null)
            : null,
          assignedUserId: assignedUserId,
        },
      );
    },
    [api, runSessionAction, conversationCycles],
  );

  const closeCycle = useCallback(
    (cycleId: CrmConversationCycleId) => {
      const cycle = conversationCycles.find((item) => item.id === cycleId);
      if (!cycle) return Promise.resolve(false);
      const commandId = createCommandId();
      return runSessionAction(
        cycleId,
        "close",
        () =>
          api.closeCycle(cycleId, {
            commandId,
          }),
        {
          ...cycle,
          status: "COMPLETED",
        },
      );
    },
    [api, runSessionAction, conversationCycles],
  );

  const concludeCycle = useCallback(
    (cycleId: CrmConversationCycleId, input: CrmConclusionInput) => {
      const cycle = conversationCycles.find((item) => item.id === cycleId);
      if (!cycle) return Promise.resolve(false);
      return runSessionAction(
        cycleId,
        "conclude",
        () => api.concludeCycle(cycleId, input),
        { ...cycle, status: "COMPLETED" },
      );
    },
    [api, runSessionAction, conversationCycles],
  );

  const toggleIntervention = useCallback(
    (cycleId: CrmConversationCycleId, enabled: boolean) => {
      const cycle = conversationCycles.find((item) => item.id === cycleId);
      if (!cycle) return Promise.resolve(false);
      const commandId = createCommandId();
      return runSessionAction(
        cycleId,
        "intervention",
        () =>
          api.updateCycleAttendance(cycleId, {
            commandId,
            enabled,
          }),
        {
          ...cycle,
          status: enabled ? "HUMAN_TAKEOVER" : "MINIBOT_ACTIVE",
        },
      );
    },
    [api, runSessionAction, conversationCycles],
  );

  const markCycleRead = useCallback(
    (cycleId: CrmConversationCycleId, options?: { silent?: boolean }) => {
      const cycle = conversationCycles.find((item) => item.id === cycleId);
      if (!cycle) return Promise.resolve(false);
      const commandId = createCommandId();
      return runSessionAction(
        cycleId,
        "read",
        () =>
          api.markCycleRead(cycleId, {
            commandId,
          }),
        {
          ...cycle,
          lastReadAt: new Date().toISOString(),
          unreadCount: 0,
        },
        options?.silent === true,
      );
    },
    [api, runSessionAction, conversationCycles],
  );

  const markCycleUnread = useCallback(
    (cycleId: CrmConversationCycleId) => {
      const cycle = conversationCycles.find((item) => item.id === cycleId);
      if (!cycle) return Promise.resolve(false);
      const commandId = createCommandId();
      return runSessionAction(
        cycleId,
        "unread",
        () =>
          api.markCycleUnread(cycleId, {
            commandId,
          }),
        {
          ...cycle,
          lastReadAt: null,
          unreadCount: Math.max(1, cycle.unreadCount ?? 0),
        },
      );
    },
    [api, runSessionAction, conversationCycles],
  );

  const addCycleTag = useCallback(
    async (
      cycleId: CrmConversationCycleId,
      input: CrmAddConversationCycleTagInput,
    ) => {
      const cycle = conversationCycles.find((item) => item.id === cycleId);
      if (!cycle) return false;
      const name = input.name.trim();
      if (!name) return false;
      return runSessionAction(
        cycleId,
        "add-tag",
        async () => ({
          result: "applied",
          cycle: (await api.addCycleTag(cycleId, input)) ?? cycle,
        }),
        {
          ...cycle,
          tags: [
            ...(cycle.tags ?? []),
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
    [api, runSessionAction, conversationCycles],
  );

  const removeCycleTag = useCallback(
    async (cycleId: CrmConversationCycleId, tagId: string) => {
      const cycle = conversationCycles.find((item) => item.id === cycleId);
      if (!cycle) return false;
      return runSessionAction(
        cycleId,
        `remove-tag:${tagId}`,
        async () => ({
          result: "applied",
          cycle: (await api.removeCycleTag(cycleId, tagId)) ?? cycle,
        }),
        {
          ...cycle,
          tags: (cycle.tags ?? []).filter((tag) => tag.id !== tagId),
        },
      );
    },
    [api, runSessionAction, conversationCycles],
  );

  const bulkAssignSessions = useCallback(
    (cycleIds: CrmConversationCycleId[], assignedUserId: string | null) =>
      runBulkSessionAction(() =>
        Promise.all(
          conversationCycles
            .filter((cycle) => cycleIds.includes(cycle.id))
            .map((cycle) =>
              api.assignCycle(cycle.id, {
                assignedUserId,
                commandId: createCommandId(),
              }),
            ),
        ),
      ),
    [api, runBulkSessionAction, conversationCycles],
  );

  const bulkCloseSessions = useCallback(
    (cycleIds: CrmConversationCycleId[]) =>
      runBulkSessionAction(() =>
        Promise.all(
          conversationCycles
            .filter((cycle) => cycleIds.includes(cycle.id))
            .map((cycle) =>
              api.concludeCycle(cycle.id, {
                commandId: createCommandId(),
                outcome: "follow_up",
              }),
            ),
        ),
      ),
    [api, runBulkSessionAction, conversationCycles],
  );

  const bulkMarkSessionsRead = useCallback(
    (cycleIds: CrmConversationCycleId[]) =>
      runBulkSessionAction(() =>
        Promise.all(
          conversationCycles
            .filter((cycle) => cycleIds.includes(cycle.id))
            .map((cycle) =>
              api.markCycleRead(cycle.id, {
                commandId: createCommandId(),
              }),
            ),
        ),
      ),
    [api, runBulkSessionAction, conversationCycles],
  );

  const bulkMarkSessionsUnread = useCallback(
    (cycleIds: CrmConversationCycleId[]) =>
      runBulkSessionAction(() =>
        Promise.all(
          conversationCycles
            .filter((cycle) => cycleIds.includes(cycle.id))
            .map((cycle) =>
              api.markCycleUnread(cycle.id, {
                commandId: createCommandId(),
              }),
            ),
        ),
      ),
    [api, runBulkSessionAction, conversationCycles],
  );

  const bulkApplySessions = useCallback(
    (cycleIds: CrmConversationCycleId[], draft: CrmBulkActionDraft) =>
      runBulkSessionAction(async () => {
        await Promise.all(
          conversationCycles
            .filter((cycle) => cycleIds.includes(cycle.id))
            .map(async (cycle) => {
              if (draft.assignedUserId !== undefined) {
                await api.assignCycle(cycle.id, {
                  assignedUserId: draft.assignedUserId,
                  commandId: createCommandId(),
                });
              }
              if (draft.tag) await api.addCycleTag(cycle.id, draft.tag);
              if (draft.readState === "read") {
                await api.markCycleRead(cycle.id, {
                  commandId: createCommandId(),
                });
              } else if (draft.readState === "unread") {
                await api.markCycleUnread(cycle.id, {
                  commandId: createCommandId(),
                });
              }
              if (draft.close) {
                await api.concludeCycle(cycle.id, {
                  commandId: createCommandId(),
                  outcome: "follow_up",
                });
              }
            }),
        );
      }),
    [api, runBulkSessionAction, conversationCycles],
  );

  return {
    actions: {
      addCycleTag,
      assignCycle,
      bulkAssignSessions,
      bulkApplySessions,
      bulkCloseSessions,
      bulkMarkSessionsRead,
      bulkMarkSessionsUnread,
      closeCycle,
      concludeCycle,
      markCycleRead,
      markCycleUnread,
      removeCycleTag,
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
