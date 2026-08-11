import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Landmark } from "lucide-react";
import {
  FeaturePageHeader,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import { useAccountSession } from "../account/accountSession";
import { readSessionActiveStore } from "../account/sessionPermissions";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { createCredereApi, type CredereApi } from "./apiClient";
import { DirectOwnerCrederePanel } from "./DirectOwnerCrederePanel";
import { createIdempotencyKey } from "./requestBuilder";
import type { SimulationPrefill } from "./SimulationForm";
import {
  SimulationDisconnectedNotice,
  SimulationLoadingNotice,
  SimulationStatusError,
  SimulationUnmappedNotice,
} from "./SimulationReadinessNotice";
import { isProcessingStatus } from "./SimulationResults";
import { SimulationsReadyWorkspace } from "./SimulationsReadyWorkspace";
import {
  createRuntimeCredereOptions,
  POLL_INTERVAL_MS,
  POLL_MAX_ATTEMPTS,
  upsertSimulation,
} from "./simulationPageUtils";
import type {
  CredereSimulation,
  CredereSimulationDraft,
  SimulationStatusState,
} from "./types";

export function SimulationsPage({
  api: apiOverride,
  prefill,
}: {
  api?: CredereApi | undefined;
  prefill?: SimulationPrefill | undefined;
}) {
  const session = useAccountSession();
  const activeStore = readSessionActiveStore(session);
  const canManageDirectCredere =
    activeStore?.role === "owner" &&
    activeStore.billingManagedBy === "store_owner";
  const apiPromise = useMemo(
    () =>
      apiOverride
        ? Promise.resolve(apiOverride)
        : createRuntimeCredereOptions().then(createCredereApi),
    [apiOverride],
  );
  const [statusState, setStatusState] = useState<SimulationStatusState>({
    kind: "loading",
  });
  const [history, setHistory] = useState<CredereSimulation[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [current, setCurrent] = useState<CredereSimulation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pollExhausted, setPollExhausted] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const pollAttemptsRef = useRef(0);
  const currentId = current?.id;
  const loadStatus = useCallback(async () => {
    setStatusState((previous) =>
      previous.kind === "ready" ? previous : { kind: "loading" },
    );
    try {
      const api = await apiPromise;
      const status = await api.getStatus();
      setStatusState({ kind: "ready", status });
    } catch (error) {
      setStatusState({
        kind: "error",
        message: formatApiErrorDisplay(
          error,
          "Não foi possível consultar a configuração do Credere.",
        ),
      });
    }
  }, [apiPromise]);
  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const api = await apiPromise;
        const list = await api.listSimulations();
        if (!cancelled) setHistory(list);
      } catch (error) {
        if (!cancelled) {
          setHistoryError(
            formatApiErrorDisplay(
              error,
              "Não foi possível carregar o histórico de simulações.",
            ),
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiPromise]);

  useEffect(() => {
    pollAttemptsRef.current = 0;
    setPollExhausted(false);
    setPollError(null);
  }, [currentId]);

  useEffect(() => {
    if (!current || !isProcessingStatus(current.status) || pollExhausted) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      pollAttemptsRef.current += 1;
      if (pollAttemptsRef.current > POLL_MAX_ATTEMPTS) {
        setPollExhausted(true);
        return;
      }
      try {
        const api = await apiPromise;
        const next = await api.refreshSimulation(current.id);
        if (cancelled) return;
        setCurrent(next);
        setHistory((previous) => upsertSimulation(previous ?? [], next));
        setPollError(null);
      } catch (error) {
        if (!cancelled) {
          setPollError(
            formatApiErrorDisplay(
              error,
              "Não foi possível consultar a atualização automática.",
            ),
          );
        }
        return;
      }
      if (!cancelled) {
        timer = setTimeout(() => void tick(), POLL_INTERVAL_MS);
      }
    };
    timer = setTimeout(() => void tick(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [apiPromise, current, pollExhausted]);

  const handleSubmit = async (draft: CredereSimulationDraft) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    const idempotencyKey = createIdempotencyKey();
    try {
      const api = await apiPromise;
      const created = await api.createSimulation(draft, { idempotencyKey });
      setCurrent(created);
      setHistory((previous) => upsertSimulation(previous ?? [], created));
    } catch (error) {
      setSubmitError(
        formatApiErrorDisplay(error, "Não foi possível enviar a simulação."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resolveFipeVehicle = useCallback(
    async (input: Parameters<CredereApi["resolveFipeVehicle"]>[0]) => {
      const api = await apiPromise;
      return api.resolveFipeVehicle(input);
    },
    [apiPromise],
  );

  const refreshCurrent = async () => {
    if (!current || isRefreshing) return;
    setIsRefreshing(true);
    setPollError(null);
    try {
      const api = await apiPromise;
      const next = await api.refreshSimulation(current.id);
      setCurrent(next);
      setHistory((previous) => upsertSimulation(previous ?? [], next));
      pollAttemptsRef.current = 0;
      setPollExhausted(false);
    } catch (error) {
      setSubmitError(
        formatApiErrorDisplay(error, "Não foi possível atualizar a simulação."),
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <FeaturePageShell className="credere-shell" variant="content">
      <FeaturePageHeader
        chip={
          statusState.kind === "ready" && statusState.status.mappedStoreAlias
            ? `Loja vinculada: ${statusState.status.mappedStoreAlias}`
            : undefined
        }
        description="Consulte os bancos autorizados para a loja ativa e acompanhe cada retorno sem confundir pré-análise com aprovação."
        eyebrow={
          <>
            <Landmark aria-hidden="true" className="size-4" />
            Financiamento
          </>
        }
        title="Simulações Credere"
      />
      {canManageDirectCredere ? (
        <DirectOwnerCrederePanel
          apiPromise={apiPromise}
          onChanged={() => void loadStatus()}
        />
      ) : null}
      {statusState.kind === "loading" ? (
        <SimulationLoadingNotice />
      ) : statusState.kind === "error" ? (
        <SimulationStatusError
          message={statusState.message}
          onRetry={() => void loadStatus()}
        />
      ) : !statusState.status.configured ? (
        <SimulationDisconnectedNotice managedByOwner={canManageDirectCredere} />
      ) : !statusState.status.mappedStoreAlias ? (
        <SimulationUnmappedNotice managedByOwner={canManageDirectCredere} />
      ) : (
        <SimulationsReadyWorkspace
          current={current}
          history={history}
          historyError={historyError}
          isRefreshing={isRefreshing}
          isSubmitting={isSubmitting}
          onRefresh={() => void refreshCurrent()}
          onResolveFipe={resolveFipeVehicle}
          onSelectSimulation={setCurrent}
          onSubmit={handleSubmit}
          pollError={pollError}
          pollExhausted={pollExhausted}
          {...(prefill ? { prefill } : {})}
          status={statusState.status}
          submitError={submitError}
        />
      )}
    </FeaturePageShell>
  );
}
