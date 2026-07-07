import { Code2, FileText, KeyRound, ShieldCheck } from "lucide-react";

const endpoint = "POST /api/v1/crm/whatsapp/integrations/bot/actions";

const examples = [
  {
    code: `{
  "action": "send_text",
  "sessionId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
  "payload": { "text": "Ola! Posso ajudar com esse veiculo?" }
}`,
    title: "Enviar texto",
  },
  {
    code: `{
  "action": "schedule_message",
  "sessionId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
  "payload": {
    "text": "Passando para confirmar sua visita.",
    "scheduledAt": "2026-07-07T13:00:00.000Z"
  }
}`,
    title: "Agendar mensagem",
  },
  {
    code: `{
  "action": "set_visita",
  "sessionId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
  "leadId": "0b6ec94e-3bd8-4782-a8bb-7de0f0afae6f",
  "payload": {
    "scheduledAt": "2026-07-08T18:00:00.000Z",
    "notes": "Cliente pediu avaliacao presencial."
  }
}`,
    title: "Criar visita",
  },
];

const actionGroups = [
  {
    actions: "send_text, send_image, send_audio, send_document",
    label: "Envio",
  },
  {
    actions: "add_note, schedule_message, set_visita, remove_visita",
    label: "Operacao",
  },
  {
    actions: "create_tag, assign_tag, remove_tag, list_tags",
    label: "Tags",
  },
  {
    actions: "set_intervention, update_session, close_session, get_session",
    label: "Sessao",
  },
  {
    actions: "check_connection",
    label: "Diagnostico",
  },
];

export function CrmWhatsappBotDocs() {
  return (
    <section className="crm-whatsapp-bot-docs">
      <header>
        <span>
          <FileText aria-hidden="true" />
        </span>
        <div>
          <p>Bot externo</p>
          <h2>Action API</h2>
        </div>
      </header>

      <div className="crm-whatsapp-bot-docs-grid">
        <article>
          <h3>
            <Code2 aria-hidden="true" />
            Endpoint
          </h3>
          <code>{endpoint}</code>
          <p>
            Todas as chamadas usam UUIDs V2 e retornam erros estaveis com
            `code`, `message` e `requestId`.
          </p>
        </article>

        <article>
          <h3>
            <KeyRound aria-hidden="true" />
            Autenticacao
          </h3>
          <code>X-Webhook-Secret: seu-segredo</code>
          <p>
            O segredo e write-only: pode ser atualizado aqui, mas nunca e
            renderizado pela API ou pela interface.
          </p>
        </article>

        <article>
          <h3>
            <ShieldCheck aria-hidden="true" />
            Intervencao humana
          </h3>
          <code>CRM_WHATSAPP_BOT_ACTION_BLOCKED</code>
          <p>
            Durante atendimento humano, envios do bot sao bloqueados. O bot pode
            chamar `set_intervention` com `enabled: false` para devolver a
            conversa ao fluxo automatico.
          </p>
        </article>
      </div>

      <div className="crm-whatsapp-bot-action-list">
        {actionGroups.map((group) => (
          <div key={group.label}>
            <strong>{group.label}</strong>
            <span>{group.actions}</span>
          </div>
        ))}
      </div>

      <div className="crm-whatsapp-bot-examples">
        {examples.map((example) => (
          <article key={example.title}>
            <h3>{example.title}</h3>
            <pre>{example.code}</pre>
          </article>
        ))}
      </div>
    </section>
  );
}
