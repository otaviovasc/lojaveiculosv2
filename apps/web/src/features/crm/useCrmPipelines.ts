import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProductCrmApi } from "./productCrmApi";
import {
  DEFAULT_PIPELINES,
  getActivePipelineId,
  saveActivePipelineId,
  type Pipeline,
  type PipelineStageDraft,
} from "./crmPipelineStorage";

export function useCrmPipelines(storeId: string, api: ProductCrmApi) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipelineId, setActivePipelineIdState] = useState<string>(() =>
    getActivePipelineId(storeId),
  );
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const activePipeline = useMemo(
    () =>
      pipelines.find((p) => p.id === activePipelineId) ??
      pipelines.find((p) => p.isDefault) ??
      pipelines[0] ??
      null,
    [activePipelineId, pipelines],
  );

  const setActivePipelineId = useCallback(
    (id: string) => {
      setActivePipelineIdState(id);
      saveActivePipelineId(id, storeId);
    },
    [storeId],
  );

  const loadPipelines = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await loadOrCreateDefaultPipeline(api);
      setPipelines(loaded);
      const current = getActivePipelineId(storeId);
      const nextActive =
        loaded.find((pipeline) => pipeline.id === current)?.id ??
        loaded.find((pipeline) => pipeline.isDefault)?.id ??
        loaded[0]?.id ??
        "";
      if (nextActive) setActivePipelineId(nextActive);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    } finally {
      setIsLoading(false);
    }
  }, [api, setActivePipelineId, storeId]);

  useEffect(() => {
    void loadPipelines();
  }, [loadPipelines]);

  const handleCreatePipelineConfirm = async (
    name: string,
    customStages?: PipelineStageDraft[],
  ) => {
    const created = await api.createPipeline({
      isDefault: pipelines.length === 0,
      name,
      stages: customStages ?? createStageDraftsFromDefault(),
    });
    setPipelines((current) => [...current, created]);
    setActivePipelineId(created.id);
  };

  const handleUpdatePipeline = async (updated: Pipeline) => {
    const saved = await api.updatePipeline(updated.id, {
      description: updated.description,
      isDefault: updated.isDefault,
      name: updated.name,
      rotationActive: updated.rotationActive,
      stages: updated.stages,
    });
    setPipelines((current) =>
      current.map((pipeline) => (pipeline.id === saved.id ? saved : pipeline)),
    );
  };

  const handleDeletePipeline = async (id: string, callback?: () => void) => {
    await api.deletePipeline(id);
    setPipelines((current) => {
      const next = current.filter((pipeline) => pipeline.id !== id);
      const fallbackId = next[0]?.id ?? "";
      if (fallbackId) setActivePipelineId(fallbackId);
      return next;
    });
    callback?.();
  };

  const handleAddStage = async (
    name: string,
    color: string,
    slaDays: number,
  ) => {
    if (!activePipeline) return;
    const saved = await api.updatePipeline(activePipeline.id, {
      stages: [
        ...activePipeline.stages,
        {
          color,
          leadStatus: "negotiating",
          name,
          slaDays: slaDays || null,
          status: "open",
        },
      ],
    });
    setPipelines((current) =>
      current.map((pipeline) => (pipeline.id === saved.id ? saved : pipeline)),
    );
  };

  return {
    activePipeline,
    activePipelineId,
    error,
    handleAddStage,
    handleCreatePipelineConfirm,
    handleDeletePipeline,
    handleUpdatePipeline,
    isLoading,
    pipelines,
    reloadPipelines: loadPipelines,
    setActivePipelineId,
  };
}

async function loadOrCreateDefaultPipeline(api: ProductCrmApi) {
  const loaded = await api.listPipelines();
  if (loaded.length) return loaded;
  const seed = DEFAULT_PIPELINES[0]!;
  return [
    await api.createPipeline({
      description: seed.description,
      isDefault: true,
      name: seed.name,
      rotationActive: seed.rotationActive,
      stages: seed.stages.map(({ id: _id, ...stage }) => stage),
    }),
  ];
}

function createStageDraftsFromDefault(): PipelineStageDraft[] {
  return DEFAULT_PIPELINES[0]!.stages.map(
    ({ id: _id, isSystem: _system, ...stage }) => stage,
  );
}
