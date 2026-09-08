import { CrmSelect } from "./CrmFormControls";
import type { CrmCampaignStageOption } from "./CrmCampaignsPageSupport";

export function CampaignAutomationPanel({
  initialStageId,
  onInitialStageChange,
  onReplyStageChange,
  onSecondaryContentChange,
  onSecondaryDelayMinutesChange,
  replyStageId,
  secondaryContent,
  secondaryDelayMinutes,
  stageOptions,
}: {
  initialStageId: string;
  onInitialStageChange: (value: string) => void;
  onReplyStageChange: (value: string) => void;
  onSecondaryContentChange: (value: string) => void;
  onSecondaryDelayMinutesChange: (value: number) => void;
  replyStageId: string;
  secondaryContent: string;
  secondaryDelayMinutes: number;
  stageOptions: CrmCampaignStageOption[];
}) {
  return (
    <section className="crm-campaign-panel">
      <h3>Automacao</h3>
      <div className="crm-campaign-fields">
        <label>
          Etapa inicial
          <CrmSelect
            onChange={onInitialStageChange}
            options={stageSelectOptions(stageOptions)}
            value={initialStageId}
          />
        </label>
        <label>
          Etapa na resposta
          <CrmSelect
            onChange={onReplyStageChange}
            options={stageSelectOptions(stageOptions)}
            value={replyStageId}
          />
        </label>
      </div>
      <label>
        Follow-up apos resposta
        <textarea
          maxLength={4000}
          onChange={(event) => onSecondaryContentChange(event.target.value)}
          placeholder="Mensagem opcional enviada depois que o cliente responder"
          rows={4}
          value={secondaryContent}
        />
      </label>
      <label>
        Atraso do follow-up min.
        <input
          min={1}
          onChange={(event) =>
            onSecondaryDelayMinutesChange(
              Math.max(1, Number(event.target.value)),
            )
          }
          type="number"
          value={secondaryDelayMinutes}
        />
      </label>
    </section>
  );
}

function stageSelectOptions(stageOptions: CrmCampaignStageOption[]) {
  return [{ label: "Sem etapa", value: "none" }, ...stageOptions];
}
