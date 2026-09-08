import { ChevronDown, KanbanSquare } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FeatureAnchoredPopover } from "../../components/ui/FeaturePopover";
import { getApiErrorDisplay } from "../../lib/apiErrors";
import { useOptionalAccountSession } from "../account/accountSession";
import { readSessionActiveStore } from "../account/sessionPermissions";
import { hasCrmPermission } from "./crmPermissions";
import { StageMenu } from "./CrmStageMenu";
import { useCrmPipelines } from "./useCrmPipelines";
import type { ProductCrmApi } from "./productCrmApi";
import type { ProductCrmLead } from "./productCrmTypes";

export function CrmConversationStageChip({
  api,
  disabled,
  leadId,
}: {
  api: ProductCrmApi;
  disabled?: boolean;
  leadId: string | null;
}) {
  const accountSession = useOptionalAccountSession();
  const storeId = readSessionActiveStore(accountSession)?.storeId ?? "";
  const canMoveStage = hasCrmPermission(accountSession, "crm.pipeline.move");
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [lead, setLead] = useState<ProductCrmLead | null>(null);
  const [leadError, setLeadError] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const { pipelines } = useCrmPipelines(storeId, api, Boolean(leadId));

  const loadLead = useCallback(async () => {
    if (!leadId || !api.getLead) return;
    try {
      setLeadError(false);
      setLead(await api.getLead(leadId));
    } catch {
      if (leadId) setLeadError(true);
    }
  }, [api, leadId]);

  useEffect(() => {
    setLead(null);
    setLeadError(false);
    void loadLead();
  }, [loadLead]);

  if (!leadId) {
    return (
      <span
        className="crm-stage-chip crm-stage-chip-muted"
        title="Vincule um lead à conversa para mover a etapa"
      >
        <KanbanSquare aria-hidden="true" />
        <span className="crm-stage-chip-name">Sem cliente vinculado</span>
      </span>
    );
  }

  const pipeline =
    pipelines.find((item) => item.id === lead?.pipelineId) ??
    pipelines.find((item) => item.isDefault) ??
    pipelines[0] ??
    null;
  const stages = pipeline?.stages ?? [];
  const stage =
    stages.find((item) => item.id === lead?.pipelineStageId) ?? null;
  const stageColor = stage?.color || "var(--color-muted)";
  const chipLabel = leadError
    ? "Etapa indisponível"
    : (stage?.name ?? (lead ? "Sem etapa" : "Carregando…"));

  return (
    <div className="crm-stage-menu-anchor">
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className="crm-stage-chip"
        disabled={
          disabled || !canMoveStage || leadError || !lead || !stages.length
        }
        onClick={() => {
          setMoveError(null);
          setOpen((current) => !current);
        }}
        ref={anchorRef}
        style={{
          backgroundColor: `color-mix(in srgb, ${stageColor} 14%, var(--color-panel))`,
          borderColor: `color-mix(in srgb, ${stageColor} 28%, var(--color-line))`,
          color: "var(--color-text)",
        }}
        title={
          stage
            ? `Etapa do lead: ${stage.name}${canMoveStage ? "" : " (somente leitura)"}`
            : "Etapa do lead"
        }
        type="button"
      >
        <span
          aria-hidden="true"
          className="crm-stage-dot"
          style={{ backgroundColor: stageColor }}
        />
        <span className="crm-stage-chip-name">{chipLabel}</span>
        {canMoveStage ? <ChevronDown aria-hidden="true" /> : null}
      </button>
      <FeatureAnchoredPopover
        align="end"
        anchorRef={anchorRef}
        ariaLabel="Mover etapa do lead"
        className="crm-stage-popover"
        initialFocus="first"
        isOpen={open && canMoveStage}
        onClose={() => setOpen(false)}
        role="dialog"
      >
        <StageMenu
          currentStageId={stage?.id ?? null}
          disabled={disabled ?? false}
          errorMessage={moveError}
          onSelect={async (stageId) => {
            if (!leadId) return false;
            setMoveError(null);
            try {
              const updated = await api.moveLeadPipelineStage(leadId, {
                pipelineStageId: stageId,
              });
              setLead(updated);
              setOpen(false);
              return true;
            } catch (error) {
              setMoveError(
                getApiErrorDisplay(
                  error,
                  "Nao foi possivel mover a etapa do lead.",
                ).message,
              );
              return false;
            }
          }}
          pipelineName={pipeline?.name}
          stages={stages}
        />
      </FeatureAnchoredPopover>
    </div>
  );
}
