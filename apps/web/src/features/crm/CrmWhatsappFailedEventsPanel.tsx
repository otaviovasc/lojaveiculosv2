import { useCallback, useEffect, useState } from "react";
import { RefreshCw, RotateCcw } from "lucide-react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import type { CrmWhatsappProviderEvent } from "./crmWhatsappTypes";

export function CrmWhatsappFailedEventsPanel({
  api,
  canRetry,
}: {
  api: CrmWhatsappApi;
  canRetry: boolean;
}) {
  const [error, setError] = useState<Error | null>(null);
  const [events, setEvents] = useState<CrmWhatsappProviderEvent[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.listFailedProviderEvents();
      setEvents(result.events);
      setIsExpanded((current) => current && result.events.length > 0);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refresh();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const retry = async (eventId: string) => {
    if (!canRetry) return;
    setRetryingId(eventId);
    setError(null);
    try {
      await api.retryProviderEvent(eventId);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    } finally {
      setRetryingId(null);
    }
  };

  if (!error && events.length === 0) return null;

  return (
    <section className="crm-whatsapp-reliability" aria-label="Eventos ZAPI">
      <button
        className="crm-whatsapp-reliability-summary"
        onClick={() => setIsExpanded((current) => !current)}
        type="button"
      >
        <span>
          {events.length > 0
            ? `${events.length} evento${events.length === 1 ? "" : "s"} ZAPI com falha`
            : "Falha ao verificar eventos ZAPI"}
        </span>
        <RefreshCw aria-hidden="true" size={16} />
      </button>
      {error ? (
        <p>
          {formatApiErrorDisplay(error, "Nao foi possivel carregar eventos.")}
        </p>
      ) : null}
      {isExpanded ? (
        <div className="crm-whatsapp-reliability-list">
          {events.map((event) => (
            <article className="crm-whatsapp-reliability-event" key={event.id}>
              <div>
                <strong>{formatWebhookType(event.webhookType)}</strong>
                <span>{formatDate(event.updatedAt)}</span>
                {event.errorMessage ? <p>{event.errorMessage}</p> : null}
              </div>
              {canRetry ? (
                <button
                  disabled={isLoading || retryingId === event.id}
                  onClick={() => void retry(event.id)}
                  type="button"
                >
                  <RotateCcw aria-hidden="true" size={15} />
                  {retryingId === event.id ? "Reprocessando" : "Reprocessar"}
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function formatWebhookType(type: CrmWhatsappProviderEvent["webhookType"]) {
  const labels: Record<string, string> = {
    chat_presence: "Presenca",
    connected: "Conexao",
    delivery: "Entrega",
    disconnected: "Desconexao",
    received: "Mensagem recebida",
    status: "Status",
  };
  return type ? (labels[type] ?? type) : "Evento ZAPI";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}
