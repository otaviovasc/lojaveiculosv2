import { useState, useMemo } from "react";
import {
  getPipelines,
  getActivePipelineId,
  savePipelines,
  saveActivePipelineId,
  type Pipeline,
} from "./crmPipelineStorage";

export function useCrmPipelines(storeId: string) {
  const [pipelines, setPipelines] = useState<Pipeline[]>(() =>
    getPipelines(storeId),
  );
  const [activePipelineId, setActivePipelineId] = useState<string>(() =>
    getActivePipelineId(storeId),
  );

  const activePipeline = useMemo(
    () =>
      pipelines.find((p) => p.id === activePipelineId) ?? pipelines[0] ?? null,
    [activePipelineId, pipelines],
  );

  const handleCreatePipelineConfirm = (name: string, customStages?: any[]) => {
    const nextId = `pipeline_${Date.now()}`;
    const defaultStages = [
      {
        id: `${nextId}_new`,
        name: "Novo",
        color: "#" + "3b82f6",
        slaDays: 1,
        status: "open" as const,
        isSystem: false,
      },
      {
        id: `${nextId}_won`,
        name: "Ganho",
        color: "#" + "22c55e",
        slaDays: null,
        status: "won" as const,
        isSystem: false,
      },
      {
        id: `${nextId}_lost`,
        name: "Perdido",
        color: "#" + "ef4444",
        slaDays: null,
        status: "lost" as const,
        isSystem: false,
      },
    ];
    const stagesToUse = customStages
      ? customStages.map((s, idx) => ({
          ...s,
          id: `${nextId}_stage_${idx}`,
          isSystem: s.status !== "open",
        }))
      : defaultStages;

    const nextPipelines: Pipeline[] = [
      ...pipelines,
      {
        id: nextId,
        name: name,
        description: "",
        isDefault: false,
        stages: stagesToUse,
        routingRules: [],
        rotationActive: false,
      },
    ];
    setPipelines(nextPipelines);
    savePipelines(nextPipelines, storeId);
    setActivePipelineId(nextId);
    saveActivePipelineId(nextId, storeId);
  };

  const handleUpdatePipeline = (updated: Pipeline) => {
    const next = pipelines.map((p) => (p.id === updated.id ? updated : p));
    setPipelines(next);
    savePipelines(next, storeId);
  };

  const handleDeletePipeline = (id: string, callback?: () => void) => {
    const next = pipelines.filter((p) => p.id !== id);
    setPipelines(next);
    savePipelines(next, storeId);
    const fallbackId = next[0]?.id ?? "vendas";
    setActivePipelineId(fallbackId);
    saveActivePipelineId(fallbackId, storeId);
    if (callback) callback();
  };

  const handleAddStage = (name: string, color: string, slaDays: number) => {
    if (!activePipeline) return;
    const nextStages = [
      ...activePipeline.stages,
      {
        id: `stage_${Date.now()}`,
        name: name,
        color: color,
        slaDays: slaDays || null,
        status: "open" as const,
        isSystem: false,
      },
    ];
    handleUpdatePipeline({ ...activePipeline, stages: nextStages });
  };

  return {
    pipelines,
    activePipelineId,
    activePipeline,
    setActivePipelineId,
    handleCreatePipelineConfirm,
    handleUpdatePipeline,
    handleDeletePipeline,
    handleAddStage,
  };
}
