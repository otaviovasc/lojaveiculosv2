import { useState } from "react";
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  CircleAlert,
  Plus,
  Trash2,
} from "lucide-react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import type { Pipeline, PipelineStage } from "./crmPipelineStorage";

type Props = {
  pipeline: Pipeline;
  onUpdate: (updated: Pipeline) => void;
};

const PRESET_COLORS = [
  "3b82f6",
  "10b981",
  "eab308",
  "f97316",
  "ef4444",
  "a855f7",
  "ec4899",
].map((c) => "#" + c);

export function CrmPipelineSettingsEtapas({ pipeline, onUpdate }: Props) {
  const [stages, setStages] = useState<PipelineStage[]>(pipeline.stages);

  const saveStages = (nextStages: PipelineStage[]) => {
    setStages(nextStages);
    onUpdate({ ...pipeline, stages: nextStages });
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = [...stages];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const temp = next[index]!;
    next[index] = next[target]!;
    next[target] = temp;
    saveStages(next);
  };

  const handleUpdateStage = (id: string, patch: Partial<PipelineStage>) => {
    const next = stages.map((s) => (s.id === id ? { ...s, ...patch } : s));
    saveStages(next);
  };

  const handleAddStage = () => {
    const newId = `stage_${Date.now()}`;
    const newStage: PipelineStage = {
      id: newId,
      name: `Nova Etapa ${stages.length + 1}`,
      color: PRESET_COLORS[stages.length % PRESET_COLORS.length]!,
      slaDays: 2,
      status: "open",
      leadStatus: "negotiating",
      isSystem: false,
    };
    saveStages([...stages, newStage]);
  };

  const handleDeleteStage = (id: string) => {
    saveStages(stages.filter((s) => s.id !== id));
  };

  const adjustSla = (stageId: string, amount: number) => {
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return;
    const currentVal = stage.slaDays ?? 0;
    const newVal = Math.max(0, currentVal + amount);
    handleUpdateStage(stageId, { slaDays: newVal === 0 ? null : newVal });
  };

  const hasWon = stages.some((s) => s.status === "won");
  const hasLost = stages.some((s) => s.status === "lost");

  return (
    <div className="flex flex-col gap-5 select-none">
      {/* Title Header with inline add stage button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-app-text">Etapas</h2>
          <p className="text-xs font-bold text-muted mt-0.5">
            Cada etapa é uma coluna no kanban. Arrasto para reordenar. Cores e
            SLA aparecem nos cards.
          </p>
        </div>
        <button
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer shadow-sm transition-colors"
          onClick={handleAddStage}
          type="button"
        >
          <Plus className="size-3.5" />
          <span>Nova etapa</span>
        </button>
      </div>

      {/* Amber/Yellow warning banner */}
      {(!hasWon || !hasLost) && (
        <div className="border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-500 rounded-lg p-3 text-xs font-bold flex items-center gap-2">
          <CircleAlert className="size-4 shrink-0" />
          <span>
            Configure uma etapa de Venda e uma de Perda para que vendedores
            consigam fechar leads.
          </span>
        </div>
      )}

      {/* Stages List */}
      <div className="flex flex-col gap-2.5">
        {stages.map((stage, idx) => (
          <div
            className="border border-line/25 bg-panel/30 rounded-xl p-3.5 flex items-center gap-4 transition-all"
            key={stage.id}
          >
            {/* Grab handle and move actions */}
            <div className="flex items-center gap-1 shrink-0 text-muted">
              <GripVertical className="size-4 cursor-grab" />
              <div className="flex flex-col">
                <button
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="p-0.5 rounded hover:bg-line/20 disabled:opacity-20 cursor-pointer"
                  type="button"
                >
                  <ChevronUp className="size-3" />
                </button>
                <button
                  onClick={() => move(idx, 1)}
                  disabled={idx === stages.length - 1}
                  className="p-0.5 rounded hover:bg-line/20 disabled:opacity-20 cursor-pointer"
                  type="button"
                >
                  <ChevronDown className="size-3" />
                </button>
              </div>
            </div>

            {/* Color indicator pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-app border border-line text-xs font-bold text-app-text select-all">
              <span
                className="size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: stage.color }}
              />
              <span className="font-mono text-xs tracking-wider">
                {stage.color.toUpperCase()}
              </span>
            </div>

            {/* Stage Name Input */}
            <div className="flex-grow min-w-0">
              <FeatureInput
                className="min-h-9 border-none bg-transparent hover:bg-line/10 focus:bg-app text-xs font-bold w-full"
                onChange={(e) =>
                  handleUpdateStage(stage.id, { name: e.target.value })
                }
                placeholder="Nome da etapa"
                value={stage.name}
              />
            </div>

            {/* SLA Stepper */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted shrink-0">
              <span>SLA</span>
              <button
                onClick={() => adjustSla(stage.id, -1)}
                className="w-5 h-5 flex items-center justify-center rounded bg-line/20 hover:bg-line/35 text-xs text-app-text cursor-pointer transition-colors"
                type="button"
              >
                —
              </button>
              <span className="w-8 text-center text-xs font-black text-app-text bg-app border border-line rounded py-0.5">
                {stage.slaDays ?? "—"}
              </span>
              <button
                onClick={() => adjustSla(stage.id, 1)}
                className="w-5 h-5 flex items-center justify-center rounded bg-line/20 hover:bg-line/35 text-xs text-app-text cursor-pointer transition-colors"
                type="button"
              >
                +
              </button>
              <span>dias</span>
            </div>

            {/* Status Selector */}
            <div className="shrink-0">
              <select
                className="min-h-8 rounded-lg border border-line bg-app px-2 text-xs font-bold text-app-text outline-none focus:border-accent"
                onChange={(e) => {
                  const status = e.target.value;
                  if (isPipelineStageStatus(status)) {
                    handleUpdateStage(stage.id, {
                      leadStatus: mapStageLeadStatus(status),
                      status,
                    });
                  }
                }}
                value={stage.status}
              >
                <option value="open">Aberto</option>
                <option value="won">Ganho</option>
                <option value="lost">Perdido</option>
              </select>
            </div>

            {/* System label or delete action */}
            <div className="shrink-0 flex items-center justify-center w-8">
              {stage.isSystem ? (
                <span className="text-xs font-black uppercase bg-line/35 text-muted px-1.5 py-0.5 rounded border border-line/45">
                  Sistema
                </span>
              ) : (
                <button
                  className="p-1.5 text-muted hover:text-red-500 rounded hover:bg-red-500/10 cursor-pointer transition-colors"
                  onClick={() => handleDeleteStage(stage.id)}
                  type="button"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function isPipelineStageStatus(
  value: string,
): value is PipelineStage["status"] {
  return value === "open" || value === "won" || value === "lost";
}

function mapStageLeadStatus(status: PipelineStage["status"]) {
  if (status === "won") return "won";
  if (status === "lost") return "lost";
  return "negotiating";
}
