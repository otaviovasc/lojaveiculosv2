import type { ReactNode } from "react";
import {
  Bot,
  ChevronDown,
  Code2,
  Copy,
  FileJson,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import {
  actionGroups,
  attendanceDegradedNotes,
  attendanceFieldRows,
  attendanceTransitionRows,
  botDocCards,
  botEndpoint,
  importantFieldNotes,
  interventionFlowNotes,
  interventionNotes,
} from "./CrmExternalBotDocsData";
import { botActionExamples } from "./CrmExternalBotActionExamplesData";
import { webhookEvents } from "./CrmExternalBotEventDocsData";

export function CrmExternalBotDocs() {
  const [method, path] = botEndpoint.split(" ");

  return (
    <section
      aria-label="Documentacao operacional do bot"
      className="crm-bot-docs"
    >
      <div className="crm-bot-docs-grid">
        {botDocCards.map((card) => (
          <article key={card.title}>
            <h3>
              {card.icon === "code" ? <Code2 aria-hidden="true" /> : null}
              {card.icon === "key" ? <KeyRound aria-hidden="true" /> : null}
              {card.icon === "shield" ? (
                <ShieldCheck aria-hidden="true" />
              ) : null}
              {card.title}
            </h3>
            {card.code === botEndpoint ? (
              <div className="crm-bot-endpoint-title">
                <span className="crm-bot-method post">POST</span>
                <code className="crm-bot-path">{path}</code>
              </div>
            ) : (
              <code>{card.code}</code>
            )}
            <p>{card.description}</p>
          </article>
        ))}
      </div>

      <DocPanel
        description="Payload V2-native encaminhado para o webhook configurado."
        icon={<FileJson aria-hidden="true" />}
        title="Payload do webhook"
      >
        <div className="crm-bot-events">
          {webhookEvents.map((event) => (
            <article key={event.event}>
              <header>
                <div>
                  <h3>{event.event}</h3>
                  <p>{event.description}</p>
                </div>
                <CopyCodeButton text={event.code} title={event.event} />
              </header>
              <pre>{event.code}</pre>
            </article>
          ))}
        </div>
      </DocPanel>

      <DocPanel
        description="Campos que o bot deve usar para classificar origem, pausa e retomada."
        icon={<Code2 aria-hidden="true" />}
        title="Campos importantes"
      >
        <div className="crm-bot-note-grid">
          {importantFieldNotes.map((note) => (
            <article key={note.title}>
              <strong>{note.title}</strong>
              <p>{note.description}</p>
            </article>
          ))}
        </div>
      </DocPanel>

      <DocPanel
        description="Acoes autenticadas por X-Webhook-Secret com UUIDs V2."
        icon={<Bot aria-hidden="true" />}
        title="Bot Action API"
      >
        <div className="crm-bot-endpoint-card">
          <div className="crm-bot-endpoint-title">
            <span className="crm-bot-method post">POST</span>
            <code className="crm-bot-path">{path}</code>
          </div>
          <span>X-Webhook-Secret: seu-segredo</span>
        </div>
        <div className="crm-bot-action-list">
          {actionGroups.map((group) => (
            <div key={group.label}>
              <strong>{group.label}</strong>
              <span>{group.actions}</span>
            </div>
          ))}
        </div>
        <div className="crm-bot-examples">
          {botActionExamples.map((example) => (
            <article key={example.title}>
              <header>
                <div>
                  <h3>{example.title}</h3>
                  <p>{example.description}</p>
                </div>
                <CopyCodeButton text={example.code} title={example.title} />
              </header>
              <pre>{example.code}</pre>
            </article>
          ))}
        </div>
      </DocPanel>

      <DocPanel
        description="Como o bot deve se comportar quando um humano assume."
        icon={<ShieldCheck aria-hidden="true" />}
        title="Estados de atendimento humano"
      >
        <div className="crm-bot-note-grid">
          {interventionFlowNotes.map((note) => (
            <article key={note.title}>
              <strong>{note.title}</strong>
              <p>{note.description}</p>
            </article>
          ))}
        </div>
        <div className="crm-bot-table-wrap">
          <table className="crm-bot-table">
            <thead>
              <tr>
                <th>Campo</th>
                <th>Tipo</th>
                <th>Uso</th>
              </tr>
            </thead>
            <tbody>
              {attendanceFieldRows.map((row) => (
                <tr key={row.field}>
                  <td>
                    <code>{row.field}</code>
                  </td>
                  <td>{row.type}</td>
                  <td>{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="crm-bot-table-wrap">
          <table className="crm-bot-table">
            <thead>
              <tr>
                <th>Evento</th>
                <th>De</th>
                <th>Para</th>
              </tr>
            </thead>
            <tbody>
              {attendanceTransitionRows.map((row) => (
                <tr key={row.event}>
                  <td>{row.event}</td>
                  <td>
                    <code>{row.from}</code>
                  </td>
                  <td>
                    <code>{row.to}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="crm-bot-note-grid">
          {interventionNotes.map((note) => (
            <article key={note.title}>
              <strong>{note.title}</strong>
              <p>{note.description}</p>
            </article>
          ))}
        </div>
        <div className="crm-bot-note-grid">
          {attendanceDegradedNotes.map((note) => (
            <article key={note.title}>
              <strong>{note.title}</strong>
              <p>{note.description}</p>
            </article>
          ))}
        </div>
      </DocPanel>
    </section>
  );
}

function DocPanel({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <details className="crm-bot-doc-panel">
      <summary>
        <span>{icon}</span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <ChevronDown aria-hidden="true" className="crm-bot-doc-chevron" />
      </summary>
      <div className="crm-bot-doc-panel-body">{children}</div>
    </details>
  );
}

function CopyCodeButton({ text, title }: { text: string; title: string }) {
  const copy = () => {
    void navigator.clipboard?.writeText(text);
  };
  return (
    <button
      aria-label={`Copiar ${title}`}
      className="crm-bot-copy"
      onClick={copy}
      title={`Copiar ${title}`}
      type="button"
    >
      <Copy aria-hidden="true" />
    </button>
  );
}
