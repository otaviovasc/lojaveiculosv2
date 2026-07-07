export const botEndpoint = "POST /api/v1/crm/whatsapp/integrations/bot/actions";

export const botDocCards = [
  {
    code: botEndpoint,
    description:
      "Todas as chamadas usam UUIDs V2 e retornam code, message e requestId em erros estaveis.",
    icon: "code",
    title: "Endpoint",
  },
  {
    code: "X-Webhook-Secret: seu-segredo",
    description:
      "O segredo e write-only: pode ser atualizado aqui, mas nunca e renderizado pela API.",
    icon: "key",
    title: "Autenticacao",
  },
  {
    code: "CRM_WHATSAPP_BOT_ACTION_BLOCKED",
    description:
      "Durante atendimento humano, envios do bot sao bloqueados ate a sessao voltar ao automatico.",
    icon: "shield",
    title: "Takeover",
  },
] as const;

export const actionGroups = [
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
] as const;

export const botActionExamples = [
  {
    code: `{
  "action": "send_text",
  "sessionId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
  "payload": { "text": "Ola! Posso ajudar com esse veiculo?" }
}`,
    description: "Envia texto em uma conversa existente.",
    title: "Enviar texto",
  },
  {
    code: `{
  "action": "send_image",
  "sessionId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
  "payload": {
    "base64": "data:image/jpeg;base64,...",
    "caption": "Foto do veiculo"
  }
}`,
    description:
      "Midia usa base64; use caption/fileName/mimeType quando precisar.",
    title: "Enviar midia",
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
    description: "Cria um agendamento V2 auditado para a sessao.",
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
    description: "Cria visita ligada ao lead V2 da conversa.",
    title: "Criar visita",
  },
  {
    code: `{
  "action": "set_intervention",
  "sessionId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
  "payload": { "enabled": false }
}`,
    description: "O bot pode devolver a conversa ao modo automatico.",
    title: "Encerrar takeover",
  },
] as const;

export const interventionNotes = [
  {
    description:
      "Enquanto a sessao esta em HUMAN_TAKEOVER, eventos message nao sao enviados ao bot.",
    title: "Pausa total de mensagens",
  },
  {
    description:
      "Se o bot tentar enviar durante takeover, recebe HTTP 403 com CRM_WHATSAPP_BOT_ACTION_BLOCKED.",
    title: "Bloqueio previsivel",
  },
  {
    description:
      "Use set_intervention com enabled false para devolver a sessao ao fluxo automatico.",
    title: "Retomada pelo bot",
  },
  {
    description:
      "intervention_ended pode trazer durationSeconds, messageCount e summary para continuidade.",
    title: "Resumo de handback",
  },
] as const;
