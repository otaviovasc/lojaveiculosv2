import { CalendarClock } from "lucide-react";

export function CampaignReviewPanel({
  canLaunch,
  intervalMinutes,
  isSaving,
  lastResult,
  localError,
  onLaunch,
  preview,
  selectedCount,
}: {
  canLaunch: boolean;
  intervalMinutes: number;
  isSaving: boolean;
  lastResult: string | null;
  localError: string | null;
  onLaunch: () => void;
  preview: string;
  selectedCount: number;
}) {
  return (
    <section className="crm-whatsapp-campaign-panel">
      <h3>
        <CalendarClock aria-hidden="true" />
        Revisao
      </h3>
      <dl className="crm-whatsapp-campaign-review">
        <div>
          <dt>Destinatarios</dt>
          <dd>{selectedCount}</dd>
        </div>
        <div>
          <dt>Duracao estimada</dt>
          <dd>{Math.max(0, selectedCount - 1) * intervalMinutes} min</dd>
        </div>
      </dl>
      <pre>{preview}</pre>
      {localError ? (
        <p className="crm-whatsapp-campaign-error">{localError}</p>
      ) : null}
      {lastResult ? (
        <p className="crm-whatsapp-campaign-success">{lastResult}</p>
      ) : null}
      <button
        className="crm-action crm-action-primary"
        disabled={!canLaunch}
        onClick={onLaunch}
        type="button"
      >
        {isSaving ? "Agendando" : "Criar campanha"}
      </button>
    </section>
  );
}
