import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Lock,
  PauseCircle,
  RotateCcw,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import {
  attendanceDegradedNotes,
  attendanceFieldRows,
  attendanceTransitionRows,
  interventionFlowNotes,
  interventionNotes,
} from "./CrmExternalBotDocsData";

export function CrmExternalBotDocsTakeover() {
  return (
    <div className="crm-bot-docs-section">
      {/* Visual State Machine Diagram */}
      <div className="crm-bot-takeover-flow-card">
        <div className="crm-bot-takeover-header">
          <span className="crm-bot-overview-icon">
            <ShieldCheck aria-hidden="true" />
          </span>
          <div>
            <h3>Fluxo do Atendimento Humano (Human Takeover)</h3>
            <p>
              Entenda como a conversa transita com segurança entre a IA do bot e
              os atendentes humanos sem concorrência de mensagens.
            </p>
          </div>
        </div>

        {/* 4 Interactive State Progression Cards */}
        <div className="crm-bot-flow-steps-grid">
          <div className="crm-bot-flow-step-card">
            <div className="crm-bot-flow-step-top">
              <span className="crm-bot-flow-step-number">1</span>
              <Bot aria-hidden="true" className="size-5 text-emerald-600" />
            </div>
            <h4>Bot Ativo</h4>
            <code>cycle.isBotActive: true</code>
            <p>
              O bot recebe eventos de mensagem e responde livremente via Bot
              Action API.
            </p>
          </div>

          <div className="crm-bot-flow-arrow">
            <ArrowRight aria-hidden="true" />
          </div>

          <div className="crm-bot-flow-step-card highlight-waiting">
            <div className="crm-bot-flow-step-top">
              <span className="crm-bot-flow-step-number">2</span>
              <PauseCircle
                aria-hidden="true"
                className="size-5 text-amber-500"
              />
            </div>
            <h4>Aguardando Humano</h4>
            <code>WAITING_HUMAN</code>
            <p>
              A IA identificou dúvida complexa ou o cliente pediu atendente.
              Gera alerta no CRM.
            </p>
          </div>

          <div className="crm-bot-flow-arrow">
            <ArrowRight aria-hidden="true" />
          </div>

          <div className="crm-bot-flow-step-card highlight-blocked">
            <div className="crm-bot-flow-step-top">
              <span className="crm-bot-flow-step-number">3</span>
              <UserCheck aria-hidden="true" className="size-5 text-blue-500" />
            </div>
            <h4>Em Atendimento</h4>
            <code>IN_HUMAN_SERVICE</code>
            <p>
              Humano enviou mensagem. Envios do bot são bloqueados com código{" "}
              <code>403</code>.
            </p>
          </div>

          <div className="crm-bot-flow-arrow">
            <ArrowRight aria-hidden="true" />
          </div>

          <div className="crm-bot-flow-step-card">
            <div className="crm-bot-flow-step-top">
              <span className="crm-bot-flow-step-number">4</span>
              <RotateCcw
                aria-hidden="true"
                className="size-5 text-emerald-600"
              />
            </div>
            <h4>Retomada da IA</h4>
            <code>null / isBotActive: true</code>
            <p>
              Atendimento concluído ou devolvido via CRM ou{" "}
              <code>set_intervention</code>.
            </p>
          </div>
        </div>
      </div>

      {/* State Transition Matrix */}
      <div className="crm-bot-contracts-card">
        <div className="crm-bot-contracts-header">
          <h3>Matriz de Transição de Estados</h3>
          <p>
            Eventos que disparam mudanças no ciclo da conversa e no estado de
            intervenção.
          </p>
        </div>

        <div className="crm-bot-table-wrap">
          <table className="crm-bot-table">
            <thead>
              <tr>
                <th>Evento Desencadeador</th>
                <th>Estado Anterior</th>
                <th>Novo Estado</th>
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
                    <span className="crm-bot-state-pill">{row.to}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* State Fields Schema Table */}
      <div className="crm-bot-contracts-card">
        <div className="crm-bot-contracts-header">
          <h3>Campos Canônicos de Atendimento</h3>
          <p>
            Propriedades presentes nos objetos <code>cycle</code> e{" "}
            <code>intervention</code> nos webhooks.
          </p>
        </div>

        <div className="crm-bot-table-wrap">
          <table className="crm-bot-table">
            <thead>
              <tr>
                <th>Campo</th>
                <th>Tipo</th>
                <th>Significado e Regra de Negócio</th>
              </tr>
            </thead>
            <tbody>
              {attendanceFieldRows.map((row) => (
                <tr key={row.field}>
                  <td>
                    <code>{row.field}</code>
                  </td>
                  <td>
                    <span className="crm-bot-type-tag">{row.type}</span>
                  </td>
                  <td>{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best Practices & Reliability Notes */}
      <div className="crm-bot-notes-grid">
        {interventionNotes.map((note) => (
          <article className="crm-bot-note-card" key={note.title}>
            <div className="crm-bot-note-title">
              <Lock aria-hidden="true" className="size-4 text-emerald-600" />
              <strong>{note.title}</strong>
            </div>
            <p>{note.description}</p>
          </article>
        ))}
        {attendanceDegradedNotes.map((note) => (
          <article className="crm-bot-note-card" key={note.title}>
            <div className="crm-bot-note-title">
              <AlertCircle
                aria-hidden="true"
                className="size-4 text-amber-500"
              />
              <strong>{note.title}</strong>
            </div>
            <p>{note.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
