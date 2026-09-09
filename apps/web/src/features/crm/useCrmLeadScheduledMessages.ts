import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { useOptionalAccountSession } from "../account/accountSession";
import type { CrmConversationApi } from "./crmConversationApi";
import type { CrmScheduledMessage } from "./crmConversationExtraTypes";
import { readCrmCapabilities } from "./crmPermissions";
import { createRuntimeCrmConversationApi } from "./runtimeApi";

export function useCrmLeadScheduledMessages(
  leadId: string,
  providedApi?: CrmConversationApi,
) {
  const api = useMemo(
    () => providedApi ?? createRuntimeCrmConversationApi(),
    [providedApi],
  );
  const session = useOptionalAccountSession();
  const permissions = readCrmCapabilities(session);
  const [state, setState] = useState<{
    leadId: string;
    items: CrmScheduledMessage[];
    error: string | null;
    loading: boolean;
  }>({ leadId, items: [], error: null, loading: true });
  const [cancelling, setCancelling] = useState<string | null>(null);
  const generation = useRef(0);
  const canRead = permissions.canScheduleRead;
  const canCancel = permissions.canScheduleCancel;
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setState((current) => ({
      leadId,
      items: current.leadId === leadId ? current.items : [],
      error: null,
      loading: canRead,
    }));
    if (!canRead) return;
    try {
      const items = await api.listScheduledMessages({ leadId, limit: 100 });
      if (request === generation.current)
        setState({ leadId, items, error: null, loading: false });
    } catch (caught) {
      if (request === generation.current)
        setState({
          leadId,
          items: [],
          error: formatApiErrorDisplay(
            caught,
            "Não foi possível carregar as mensagens agendadas.",
          ),
          loading: false,
        });
    }
  }, [api, canRead, leadId]);
  useEffect(() => {
    void refresh();
    return () => {
      generation.current++;
    };
  }, [refresh]);
  const cancel = async (message: CrmScheduledMessage) => {
    if (
      !canCancel ||
      message.status !== "pending" ||
      cancelling ||
      state.leadId !== leadId
    )
      return;
    const request = generation.current;
    setCancelling(message.id);
    try {
      const updated = await api.cancelScheduledMessage(message.id);
      if (request !== generation.current) return;
      if (!updated || updated.status !== "cancelled")
        throw new Error("O cancelamento não foi confirmado. Atualize a lista.");
      setState((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === updated.id ? updated : item,
        ),
        error: null,
      }));
    } catch (caught) {
      if (request === generation.current)
        setState((current) => ({
          ...current,
          error: formatApiErrorDisplay(
            caught,
            "Não foi possível cancelar a mensagem.",
          ),
        }));
    } finally {
      setCancelling(null);
    }
  };
  return {
    canRead,
    canCancel,
    cancelling,
    cancel,
    refresh,
    items: state.leadId === leadId ? state.items : [],
    error: state.leadId === leadId ? state.error : null,
    loading: state.leadId !== leadId || state.loading,
  };
}
