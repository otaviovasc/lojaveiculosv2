import type { CrmWhatsappTag } from "./crmWhatsappTypes";

export function CampaignAutomationPanel({
  initialTagId,
  onInitialTagChange,
  onReplyTagChange,
  onSecondaryContentChange,
  onSecondaryDelayMinutesChange,
  replyTagId,
  secondaryContent,
  secondaryDelayMinutes,
  tags,
}: {
  initialTagId: string;
  onInitialTagChange: (value: string) => void;
  onReplyTagChange: (value: string) => void;
  onSecondaryContentChange: (value: string) => void;
  onSecondaryDelayMinutesChange: (value: number) => void;
  replyTagId: string;
  secondaryContent: string;
  secondaryDelayMinutes: number;
  tags: CrmWhatsappTag[];
}) {
  return (
    <section className="crm-whatsapp-campaign-panel">
      <h3>Automacao</h3>
      <div className="crm-whatsapp-campaign-fields">
        <label>
          Tag inicial
          <select
            onChange={(event) => onInitialTagChange(event.target.value)}
            value={initialTagId}
          >
            <option value="none">Sem tag</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tag na resposta
          <select
            onChange={(event) => onReplyTagChange(event.target.value)}
            value={replyTagId}
          >
            <option value="none">Sem tag</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
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
