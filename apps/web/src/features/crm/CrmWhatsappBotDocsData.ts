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

export const importantFieldNotes = [
  {
    description:
      "true quando a mensagem saiu da loja; false quando veio do cliente.",
    title: "message.fromMe",
  },
  {
    description:
      "true para envio por CRM, scheduled message ou Bot Action API.",
    title: "message.wasSentByApi",
  },
  {
    description: "customer, bot_api, human_crm, human_whatsapp ou system.",
    title: "message.senderOrigin",
  },
  {
    description:
      "false em HUMAN_TAKEOVER; o bot deve pausar respostas automaticas.",
    title: "session.isBotActive",
  },
  {
    description:
      "Etiquetas V2 do WhatsApp. Nao representam etapas de pipeline.",
    title: "session.tags",
  },
  {
    description: "URL e metodo de autenticacao para chamar a Bot Action API.",
    title: "actionsApi",
  },
] as const;

export const interventionFlowNotes = [
  {
    description:
      "Quando um humano envia mensagem ou assume a sessao, V2 dispara intervention_started e para de encaminhar eventos message regulares.",
    title: "Inicio",
  },
  {
    description:
      "triggeredBy indica human, bot ou system; reason explica o motivo operacional como human_outbound_message ou bot_action.",
    title: "Origem",
  },
  {
    description:
      "Durante takeover, send_text/send_image/send_audio/send_document retornam CRM_WHATSAPP_BOT_ACTION_BLOCKED.",
    title: "Bloqueio",
  },
  {
    description:
      "intervention_ended inclui summary quando ha mensagens suficientes para o bot retomar com contexto.",
    title: "Handback",
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
      "Se o bot tentar enviar durante takeover, recebe erro estavel CRM_WHATSAPP_BOT_ACTION_BLOCKED.",
    title: "Bloqueio previsivel",
  },
  {
    description:
      "Use set_intervention com enabled false para devolver a sessao ao fluxo automatico.",
    title: "Retomada pelo bot",
  },
  {
    description:
      "Nao use summary para substituir historico; ele e contexto curto para continuidade.",
    title: "Resumo de handback",
  },
] as const;
