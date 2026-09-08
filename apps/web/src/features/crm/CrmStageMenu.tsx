import { Check, KanbanSquare, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Morphicon } from "../../components/ui/Morphicon";
import type { PipelineStage } from "./crmPipelineStorage";

export function StageMenu({
  currentStageId,
  disabled,
  errorMessage,
  onSelect,
  pipelineName,
  stages,
}: {
  currentStageId: string | null;
  disabled?: boolean;
  errorMessage?: string | null;
  onSelect: (stageId: string) => Promise<boolean>;
  pipelineName?: string | undefined;
  stages: PipelineStage[];
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");

  const filteredStages = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return stages;
    return stages.filter((stage) =>
      stage.name.toLocaleLowerCase("pt-BR").includes(term),
    );
  }, [stages, search]);

  const handleSelect = async (stageId: string) => {
    if (disabled || isSaving || stageId === currentStageId) return;
    setIsSaving(true);
    try {
      await onSelect(stageId);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="crm-stage-menu">
      <div className="crm-stage-menu-header">
        <span className="crm-stage-menu-title">
          <KanbanSquare className="size-3.5 text-primary" aria-hidden="true" />
          <span>Etapa do lead{pipelineName ? ` · ${pipelineName}` : ""}</span>
        </span>
      </div>

      {stages.length > 6 ? (
        <label className="crm-stage-search">
          <Morphicon
            active={Boolean(search)}
            aria-hidden="true"
            className="size-4 text-muted"
            name="search-close"
            size={16}
          />
          <input
            disabled={disabled || isSaving}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar etapa"
            value={search}
          />
          {search ? (
            <button
              aria-label="Limpar busca de etapa"
              className="crm-stage-search-clear"
              onClick={() => setSearch("")}
              type="button"
            >
              <Morphicon
                active
                aria-hidden="true"
                name="check-cross"
                size={14}
              />
            </button>
          ) : null}
        </label>
      ) : null}

      {errorMessage ? (
        <p className="crm-stage-menu-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {filteredStages.length > 0 ? (
        <div className="crm-stage-list" aria-label="Etapas do pipeline">
          {filteredStages.map((stage) => {
            const active = stage.id === currentStageId;
            const stageColor = stage.color || "var(--color-muted)";
            return (
              <button
                aria-pressed={active}
                className={`crm-stage-list-item${active ? " crm-stage-item-active" : ""}`}
                disabled={disabled || isSaving}
                key={stage.id}
                onClick={() => void handleSelect(stage.id)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={`crm-stage-check${active ? " crm-stage-check-active" : ""}`}
                >
                  {active ? (
                    <Check className="size-3" aria-hidden="true" />
                  ) : null}
                </span>
                <span
                  aria-hidden="true"
                  className="crm-stage-color-dot"
                  style={{ backgroundColor: stageColor }}
                />
                <span className="crm-stage-item-label">
                  <span className="crm-stage-item-name">{stage.name}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="crm-stage-empty-state">
          <p>
            {search.trim()
              ? `Nenhuma etapa encontrada para “${search}”`
              : "Nenhuma etapa neste pipeline"}
          </p>
        </div>
      )}
    </div>
  );
}
