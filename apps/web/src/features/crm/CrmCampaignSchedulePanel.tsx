import { CalendarClock, UsersRound } from "lucide-react";
import { DatePickerField } from "../../components/ui/DatePickerField";
import { TimePickerField } from "../../components/ui/TimePickerField";
import { readMinDateTimeLocal } from "./CrmCampaignsPageUtils";

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

  const parsedDate =
    startAt && !Number.isNaN(new Date(startAt).getTime())
      ? new Date(startAt)
      : null;

  const timeString =
    startAt && startAt.includes("T")
      ? (startAt.split("T")[1]?.slice(0, 5) ?? "09:00")
      : "09:00";

  const handleDateChange = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const time = timeString || "09:00";
    onStartAtChange(`${year}-${month}-${day}T${time}`);
  };

  const handleTimeChange = (newTime: string) => {
    const datePart =
      startAt && startAt.includes("T")
        ? startAt.split("T")[0]
        : new Date().toISOString().slice(0, 10);
    onStartAtChange(`${datePart}T${newTime}`);
  };

  return (
    <div className="crm-campaign-schedule-grid">
      <section className="crm-campaign-panel">
        <h3>Programacao</h3>
        <div className="crm-visit-datetime-field-group">
          <div className="crm-visit-datepicker-block">
            <span className="crm-visit-field-label">Primeiro envio</span>
            <DatePickerField
              label="Data"
              minDate={new Date()}
              onChange={handleDateChange}
              value={parsedDate}
            />
          </div>
          <div className="crm-visit-timepicker-block">
            <span className="crm-visit-field-label">Horário</span>
            <TimePickerField
              label="Horário"
              onChange={handleTimeChange}
              value={timeString}
            />
          </div>
        </div>
        <input
          aria-label="Inicio da campanha"
          className="sr-only"
          min={readMinDateTimeLocal()}
          onChange={(event) => onStartAtChange(event.target.value)}
          tabIndex={-1}
          type="datetime-local"
          value={startAt}
        />
        <label>
          Intervalo entre mensagens
          <div className="crm-campaign-interval-field">
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
        {localError ? <p className="crm-campaign-error">{localError}</p> : null}
      </section>
      <aside className="crm-campaign-panel crm-campaign-final-summary">
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
        <div className="crm-campaign-message-preview">
          <span>Previa da primeira mensagem</span>
          <p>{preview}</p>
        </div>
      </aside>
    </div>
  );
}
