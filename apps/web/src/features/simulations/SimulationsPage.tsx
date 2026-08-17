import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Landmark } from "lucide-react";
import {
  FeaturePageHeader,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import { Toast } from "../../components/ui/Toast";
import { useAccountSession } from "../account/accountSession";
import { readSessionActiveStore } from "../account/sessionPermissions";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { createCredereApi, type CredereApi } from "./apiClient";
import { DirectOwnerCrederePanel } from "./DirectOwnerCrederePanel";
import {
  nextIdempotencyOperation,
  type CredereIdempotencyOperation,
} from "./requestBuilder";
import type { SimulationPrefill } from "./SimulationForm";
import { useSimulationRoutePrefill } from "./simulationRoutePrefill";
import {
  SimulationDisconnectedNotice,
  SimulationLoadingNotice,
  SimulationStatusError,
  SimulationUnmappedNotice,
} from "./SimulationReadinessNotice";
import { isProcessingStatus } from "./SimulationResults";
import { SimulationsReadyWorkspace } from "./SimulationsReadyWorkspace";
import { simulationSnapshotsEqual } from "./simulationPresentation";
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

function readSimulationIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#\/?/, "");
  const hashParts = hash.split("?")[0]?.split("/").filter(Boolean) ?? [];
  if (hashParts[0] === "simulations" && hashParts[1]) {
    return hashParts[1];
  }
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  if (pathParts[0] === "simulations" && pathParts[1]) {
    return pathParts[1];
  }
  const params = new URLSearchParams(window.location.search);
  const idFromParam = params.get("simulationId") ?? params.get("id");
  if (idFromParam) return idFromParam.trim();
  return null;
}

export function SimulationsPage({
  api: apiOverride,
  prefill,
}: {
  api?: CredereApi | undefined;
  prefill?: SimulationPrefill | undefined;
}) {
  const resolvedPrefill = useSimulationRoutePrefill(prefill);
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
  const [syncFailed, setSyncFailed] = useState(false);
  const [current, setCurrent] = useState<CredereSimulation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pollExhausted, setPollExhausted] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const pollAttemptsRef = useRef(0);
  const idempotencyOperationRef = useRef<CredereIdempotencyOperation | null>(
    null,
  );
  const currentId = current?.id;
  const storeSimulationSnapshot = useCallback((next: CredereSimulation) => {
    setCurrent((previous) =>
      simulationSnapshotsEqual(previous, next) ? previous : next,
    );
    setHistory((previous) => {
      const existing = previous?.find((item) => item.id === next.id);
      return simulationSnapshotsEqual(existing, next)
        ? previous
        : upsertSimulation(previous ?? [], next);
    });
  }, []);

  const handleSelectSimulation = useCallback(
    async (simulation: CredereSimulation | null) => {
      if (!simulation) {
        setCurrent(null);
        if (
          typeof window !== "undefined" &&
          window.location.hash.includes("simulations/")
        ) {
          window.location.hash = "/simulations";
        }
        return;
      }
      storeSimulationSnapshot(simulation);
      if (typeof window !== "undefined") {
        window.location.hash = `/simulations/${simulation.id}`;
        window.scrollTo({ behavior: "smooth", top: 0 });
      }
      try {
        const api = await apiPromise;
        const fresh = await api.getSimulation(simulation.id);
        storeSimulationSnapshot(fresh);
      } catch {
        // Keep optimistic snapshot if API query fails
      }
    },
    [apiPromise, storeSimulationSnapshot],
  );

  useEffect(() => {
    const targetId = readSimulationIdFromUrl();
    if (!targetId || current?.id === targetId) return;

    let cancelled = false;
    void (async () => {
      try {
        const api = await apiPromise;
        const found = await api.getSimulation(targetId);
        if (!cancelled && found) {
          storeSimulationSnapshot(found);
          window.scrollTo({ behavior: "smooth", top: 0 });
        }
      } catch {
        // Ignore if simulation cannot be loaded by ID
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiPromise, current?.id, storeSimulationSnapshot]);
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

  const historyReady =
    statusState.kind === "ready" &&
    statusState.status.configured &&
    Boolean(statusState.status.mappedStoreAlias);
  useEffect(() => {
    if (!historyReady) return;
    let cancelled = false;
    void (async () => {
      const api = await apiPromise;
      try {
        await api.syncSimulations();
        if (!cancelled) setSyncFailed(false);
      } catch {
        if (!cancelled) setSyncFailed(true);
      }
      try {
        const list = await api.listSimulations();
        if (!cancelled) {
          setHistory(list);
          setHistoryError(null);
        }
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
  }, [apiPromise, historyReady]);

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
        storeSimulationSnapshot(next);
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
  }, [apiPromise, current, pollExhausted, storeSimulationSnapshot]);

  const handleSubmit = async (draft: CredereSimulationDraft) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    const operation = nextIdempotencyOperation(
      idempotencyOperationRef.current,
      draft,
    );
    idempotencyOperationRef.current = operation;
    try {
      const api = await apiPromise;
      const created = await api.createSimulation(draft, {
        idempotencyKey: operation.key,
      });
      storeSimulationSnapshot(created);
      idempotencyOperationRef.current = null;
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
  const getRequiredFields = useCallback(
    async (input: Parameters<CredereApi["getRequiredFields"]>[0]) => {
      const api = await apiPromise;
      return api.getRequiredFields(input);
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
      storeSimulationSnapshot(next);
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
        className="credere-shell-header"
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
      {syncFailed ? (
        <Toast
          onDismiss={() => setSyncFailed(false)}
          title="Não foi possível sincronizar o histórico com o Credere"
          tone="warning"
        >
          Exibindo as simulações já registradas nesta loja.
        </Toast>
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
          onGetRequiredFields={getRequiredFields}
          onResolveFipe={resolveFipeVehicle}
          onSelectSimulation={(simulation) => {
            void handleSelectSimulation(simulation);
          }}
          onSubmit={handleSubmit}
          pollError={pollError}
          pollExhausted={pollExhausted}
          {...(resolvedPrefill ? { prefill: resolvedPrefill } : {})}
          status={statusState.status}
          submitError={submitError}
        />
      )}
    </FeaturePageShell>
  );
}
