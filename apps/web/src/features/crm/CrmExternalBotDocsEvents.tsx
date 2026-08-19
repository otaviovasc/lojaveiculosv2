import { useState } from "react";
import { Check, Copy, FileJson, Info } from "lucide-react";
import { webhookEvents } from "./CrmExternalBotEventDocsData";
import { importantFieldNotes } from "./CrmExternalBotDocsData";

export function CrmExternalBotDocsEvents() {
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const selectedEvent = webhookEvents[selectedEventIndex] ?? webhookEvents[0];

  const copyPayload = () => {
    if (!selectedEvent) return;
    void navigator.clipboard?.writeText(selectedEvent.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="crm-bot-docs-section">
      {/* Event Selector Header */}
      <div className="crm-bot-events-explorer-card">
        <div className="crm-bot-events-nav-header">
          <div>
            <h3>Explorador de Eventos de Webhook</h3>
            <p>
              Selecione o tipo de evento para inspecionar o payload JSON
              encaminhado para sua URL em tempo real.
            </p>
          </div>
        </div>

        <div
          aria-label="Tipos de eventos de webhook"
          className="crm-bot-event-tabs"
          role="tablist"
        >
          {webhookEvents.map((eventItem, index) => {
            const isSelected = selectedEventIndex === index;
            return (
              <button
                aria-selected={isSelected}
                className={`crm-bot-event-tab ${
                  isSelected ? "crm-bot-event-tab-active" : ""
                }`}
                key={eventItem.event}
                onClick={() => setSelectedEventIndex(index)}
                role="tab"
                type="button"
              >
                <FileJson aria-hidden="true" className="size-4" />
                <span>{eventItem.event}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Event Payload Viewer */}
        <div className="crm-bot-event-viewer">
          <div className="crm-bot-event-viewer-header">
            <div className="crm-bot-event-viewer-info">
              <span className="crm-bot-event-tag">
                <code>event: &quot;{selectedEvent.event}&quot;</code>
              </span>
              <p>{selectedEvent.description}</p>
            </div>
            <button
              aria-label={`Copiar payload do evento ${selectedEvent.event}`}
              className="crm-bot-copy-btn"
              onClick={copyPayload}
              type="button"
            >
              {copied ? (
                <>
                  <Check
                    aria-hidden="true"
                    className="size-3.5 text-emerald-600"
                  />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy aria-hidden="true" className="size-3.5" />
                  <span>Copiar JSON</span>
                </>
              )}
            </button>
          </div>

          <pre className="crm-bot-code-block">{selectedEvent.code}</pre>
        </div>
      </div>

      {/* Field Dictionary Reference */}
      <div className="crm-bot-fields-card">
        <div className="crm-bot-fields-header">
          <span className="crm-bot-overview-icon">
            <Info aria-hidden="true" />
          </span>
          <div>
            <h3>Dicionário de Campos Importantes</h3>
            <p>
              Campos essenciais para classificar a origem de cada mensagem,
              detectar pausas e responder com o contexto correto.
            </p>
          </div>
        </div>

        <div className="crm-bot-fields-grid">
          {importantFieldNotes.map((note) => (
            <article className="crm-bot-field-item" key={note.title}>
              <code>{note.title}</code>
              <p>{note.description}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
