import { useCallback, useEffect, useMemo, useState } from "react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { AutomationApi } from "./apiClient";
import { toDecisionInput } from "./automationModel";
import {
  AUTOMATION_RUN_PAGE_SIZE,
  mergeAutomationRunPages,
  nextAutomationOffset,
} from "./automationRunPages";
import type {
  AutomationRun,
  AutomationRunSummary,
  AutomationRunStep,
  CreateAutomationRunInput,
} from "./types";

export function useAutomationWorkspace(api: AutomationApi) {
  const [runs, setRuns] = useState<AutomationRunSummary[]>([]);
  const [selectedRun, setSelectedRun] = useState<AutomationRun | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextOffset, setNextOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const loadRuns = useCallback(async () => {
    setError(null);
    const response = await api.listRuns({
      limit: AUTOMATION_RUN_PAGE_SIZE,
      offset: 0,
    });
    setRuns(response.data);
    setNextOffset(nextAutomationOffset(response));
    setTotalCount(Math.max(response.meta.total, response.data.length));
    setSelectedRunId((current) => current ?? response.data[0]?.id ?? null);
  }, [api]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || nextOffset >= totalCount) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const response = await api.listRuns({
        limit: AUTOMATION_RUN_PAGE_SIZE,
        offset: nextOffset,
      });
      setRuns((current) => mergeAutomationRunPages(current, response.data));
      setNextOffset(nextAutomationOffset(response));
      setTotalCount((current) => Math.max(current, response.meta.total));
    } catch (nextError) {
      setError(
        formatApiErrorDisplay(
          nextError,
          "Não foi possível carregar mais automações.",
        ),
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [api, isLoadingMore, nextOffset, totalCount]);

  const refresh = useCallback(async () => {
    setIsWorking(true);
    try {
      await loadRuns();
      if (selectedRunId) setSelectedRun(await api.getRun(selectedRunId));
    } catch (nextError) {
      setError(
        formatApiErrorDisplay(
          nextError,
          "Não foi possível atualizar as automações.",
        ),
      );
    } finally {
      setIsWorking(false);
    }
  }, [api, loadRuns, selectedRunId]);

  useEffect(() => {
    let active = true;
    loadRuns()
      .catch((nextError) => {
        if (active) {
          setError(
            formatApiErrorDisplay(
              nextError,
              "Não foi possível carregar as automações.",
            ),
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadRuns]);

  useEffect(() => {
    if (!selectedRunId) {
      setSelectedRun(null);
      return;
    }
    let active = true;
    api
      .getRun(selectedRunId)
      .then((run) => {
        if (active) setSelectedRun(run);
      })
      .catch((nextError) => {
        if (active)
          setError(
            formatApiErrorDisplay(
              nextError,
              "Não foi possível abrir a automação.",
            ),
          );
      });
    return () => {
      active = false;
    };
  }, [api, selectedRunId]);

  const createRun = useCallback(
    async (input: CreateAutomationRunInput) => {
      await runMutation(async () => {
        const run = await api.createRun(input);
        setSelectedRun(run);
        setSelectedRunId(run.id);
        await loadRuns();
      });
    },
    [api, loadRuns],
  );

  const decide = useCallback(
    async (step: AutomationRunStep, decision: "approve" | "reject") => {
      if (!selectedRun) return;
      const input = toDecisionInput(selectedRun, step);
      if (!input) return;
      await runMutation(async () => {
        const run =
          decision === "approve"
            ? await api.approveStep(input)
            : await api.rejectStep(input);
        setSelectedRun(run);
        await loadRuns();
      });
    },
    [api, loadRuns, selectedRun],
  );

  const cancelRun = useCallback(async () => {
    if (!selectedRun) return;
    await runMutation(async () => {
      const run = await api.cancelRun(selectedRun.id, selectedRun.version);
      setSelectedRun(run);
      await loadRuns();
    });
  }, [api, loadRuns, selectedRun]);

  async function runMutation(operation: () => Promise<void>) {
    setIsWorking(true);
    setError(null);
    try {
      await operation();
    } catch (nextError) {
      setError(
        formatApiErrorDisplay(
          nextError,
          "A automação mudou ou a ação não pôde ser concluída.",
        ),
      );
      throw nextError;
    } finally {
      setIsWorking(false);
    }
  }

  const metrics = useMemo(
    () => ({
      approved: runs.filter((run) => run.status === "approved").length,
      awaiting: runs.filter((run) => run.status === "awaiting_approval").length,
      blocked: runs.filter(
        (run) => run.status === "rejected" || run.status === "cancelled",
      ).length,
      loaded: runs.length,
      total: totalCount,
    }),
    [runs, totalCount],
  );

  return {
    cancelRun,
    createRun,
    decide,
    error,
    hasMore: nextOffset < totalCount,
    isLoading,
    isLoadingMore,
    isWorking,
    loadMore,
    metrics,
    refresh,
    runs,
    selectedRun,
    selectedRunId,
    setSelectedRunId,
  };
}
