import { CalendarClock, UsersRound } from "lucide-react";
import { readMinDateTimeLocal } from "./CrmWhatsappCampaignsPageUtils";

export function CampaignSchedulePanel({
  campaignName,
  intervalMinutes,
  localError,
  onIntervalMinutesChange,
  onStartAtChange,
  preview,
  selectedCount,
  startAt,
}: {
  campaignName: string;
  intervalMinutes: number;
  localError: string | null;
  onIntervalMinutesChange: (value: number) => void;
  onStartAtChange: (value: string) => void;
  preview: string;
  selectedCount: number;
  startAt: string;
}) {
  const duration = Math.max(0, selectedCount - 1) * intervalMinutes;
  return (
    <div className="crm-whatsapp-campaign-schedule-grid">
      <section className="crm-whatsapp-campaign-panel">
        <h3>Programacao</h3>
        <label>
          Primeiro envio
          <input
            aria-label="Inicio da campanha"
            min={readMinDateTimeLocal()}
            onChange={(event) => onStartAtChange(event.target.value)}
            type="datetime-local"
            value={startAt}
          />
        </label>
        <label>
          Intervalo entre mensagens
          <div className="crm-whatsapp-campaign-interval-field">
            <input
              aria-label="Intervalo em minutos"
              min={1}
              onChange={(event) =>
                onIntervalMinutesChange(Math.max(1, Number(event.target.value)))
              }
              type="number"
              value={intervalMinutes}
            />
            <span>minutos</span>
          </div>
        </label>
        {localError ? (
          <p className="crm-whatsapp-campaign-error">{localError}</p>
        ) : null}
      </section>
      <aside className="crm-whatsapp-campaign-panel crm-whatsapp-campaign-final-summary">
        <h3>Confirmacao</h3>
        <strong>{campaignName}</strong>
        <dl>
          <div>
            <dt>
              <UsersRound aria-hidden="true" /> Destinatarios
            </dt>
            <dd>{selectedCount}</dd>
          </div>
          <div>
            <dt>
              <CalendarClock aria-hidden="true" /> Duracao estimada
            </dt>
            <dd>{duration} min</dd>
          </div>
        </dl>
        <div className="crm-whatsapp-campaign-message-preview">
          <span>Previa da primeira mensagem</span>
          <p>{preview}</p>
        </div>
      </aside>
    </div>
  );
}
