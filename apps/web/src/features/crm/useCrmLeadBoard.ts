import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRemoteSearch } from "../../lib/useRemoteSearch";
import type { ProductCrmApi } from "./productCrmApi";
import type { LeadFilters } from "./crmPipelineModels";
import type { Pipeline } from "./crmPipelineStorage";
import {
  loadCrmLeadBoard,
  loadCrmLeadStagePage,
  type CrmLeadBoardPages,
} from "./crmLeadBoardData";

export function useCrmLeadBoard(
  api: ProductCrmApi,
  pipeline: Pipeline | null,
  filters: LeadFilters,
  enabled: boolean,
) {
  const deferredFilters = useDeferredSearchFilters(filters);
  const [pages, setPages] = useState<CrmLeadBoardPages>({});
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [loadingStageIds, setLoadingStageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const refreshSequence = useRef(0);
  const loadingStageIdsRef = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    if (!enabled || !pipeline) {
      setPages({});
      setIsLoading(false);
      return;
    }
    if (!deferredFilters) {
      setIsLoading(false);
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const nextPages = await loadCrmLeadBoard(api, pipeline, deferredFilters);
      if (refreshSequence.current === sequence) setPages(nextPages);
    } catch (caught) {
      if (refreshSequence.current === sequence) {
        setError(caught instanceof Error ? caught : new Error(String(caught)));
      }
    } finally {
      if (refreshSequence.current === sequence) setIsLoading(false);
    }
  }, [api, deferredFilters, enabled, pipeline]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadMoreStage = useCallback(
    async (stageId: string) => {
      if (
        !pipeline ||
        !deferredFilters ||
        loadingStageIdsRef.current.has(stageId)
      )
        return;
      const current = pages[stageId];
      if (!current?.nextCursor) return;

      const sequence = refreshSequence.current;
      loadingStageIdsRef.current.add(stageId);
      setLoadingStageIds((stageIds) => new Set(stageIds).add(stageId));
      try {
        const next = await loadCrmLeadStagePage(
          api,
          pipeline.id,
          stageId,
          deferredFilters,
          current.nextCursor,
        );
        setPages((allPages) => {
          if (refreshSequence.current !== sequence) return allPages;
          const latest = allPages[stageId];
          if (!latest || latest.nextCursor !== current.nextCursor) {
            return allPages;
          }
          const knownIds = new Set(latest.leads.map((lead) => lead.id));
          return {
            ...allPages,
            [stageId]: {
              ...next,
              leads: [
                ...latest.leads,
                ...next.leads.filter((lead) => !knownIds.has(lead.id)),
              ],
            },
          };
        });
      } catch (caught) {
        setError(caught instanceof Error ? caught : new Error(String(caught)));
      } finally {
        loadingStageIdsRef.current.delete(stageId);
        setLoadingStageIds((stageIds) => {
          const next = new Set(stageIds);
          next.delete(stageId);
          return next;
        });
      }
    },
    [api, deferredFilters, pages, pipeline],
  );

  const leads = useMemo(
    () =>
      pipeline?.stages.flatMap((stage) => pages[stage.id]?.leads ?? []) ?? [],
    [pages, pipeline],
  );
  const stageTotals = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(pages).map(([stageId, page]) => [stageId, page.total]),
      ) as Record<string, number>,
    [pages],
  );

  return {
    error,
    isLoading,
    leads,
    loadMoreStage,
    loadingStageIds,
    refresh,
    stageTotals,
  };
}

function useDeferredSearchFilters(filters: LeadFilters) {
  const search = useRemoteSearch(filters.search, { minLength: 1 });
  return useMemo(
    () => (search === null ? null : { ...filters, search }),
    [filters, search],
  );
}
