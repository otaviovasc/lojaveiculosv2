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
      "WAITING_HUMAN quando a IA pediu ajuda; IN_HUMAN_SERVICE depois do primeiro envio humano confirmado; null fora do atendimento humano.",
    title: "session.humanAttendanceState",
  },
  {
    description:
      "bot, auto ou ai_request na Bot Action API. O webhook tambem informa source e triggeredBy na intervencao.",
    title: "intervention.source",
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
      "Quando a IA pausa e pede ajuda, V2 grava WAITING_HUMAN, dispara intervention_started e para de encaminhar eventos message regulares.",
    title: "Aguardando humano",
  },
  {
    description:
      "Depois que texto, audio, imagem, video, documento, localizacao, contato, catalogo ou veiculo humano for aceito pelo provedor, V2 muda para IN_HUMAN_SERVICE. Reacoes nao mudam o estado.",
    title: "Atendimento iniciado",
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

export const attendanceFieldRows = [
  {
    field: "humanAttendanceState",
    meaning:
      "WAITING_HUMAN, IN_HUMAN_SERVICE ou null. E a fonte canonica para badges e filtros.",
    type: "string | null",
  },
  {
    field: "humanAttendanceChangedAt",
    meaning: "Instante ISO 8601 da ultima mudanca do estado de atendimento.",
    type: "string | null",
  },
  {
    field: "humanHandlingStartedAt",
    meaning:
      "Instante ISO 8601 do primeiro envio humano aceito pelo provedor; null enquanto aguarda.",
    type: "string | null",
  },
  {
    field: "humanAttendanceStateVersion",
    meaning:
      "Versao monotona. Ignore eventos com versao menor que a ultima processada para a sessao.",
    type: "number | null",
  },
  {
    field: "interventionId",
    meaning:
      "UUID que correlaciona a pausa, o inicio do atendimento e a devolucao da mesma intervencao.",
    type: "string | null",
  },
] as const;

export const attendanceTransitionRows = [
  {
    event: "IA pausa e solicita ajuda humana",
    from: "null",
    to: "WAITING_HUMAN",
  },
  {
    event: "Primeiro envio humano aceito pelo provedor",
    from: "WAITING_HUMAN",
    to: "IN_HUMAN_SERVICE",
  },
  {
    event: "Humano assume manualmente",
    from: "null",
    to: "IN_HUMAN_SERVICE",
  },
  {
    event: "Intervencao encerrada, sessao concluida ou devolvida a IA",
    from: "WAITING_HUMAN | IN_HUMAN_SERVICE",
    to: "null",
  },
  {
    event: "Reacao ou falha de envio",
    from: "qualquer estado",
    to: "sem mudanca",
  },
] as const;

export const attendanceDegradedNotes = [
  {
    description:
      "Responda 2xx somente depois de persistir o evento. Em timeout ou 5xx, use event id e interventionId para deduplicar a repeticao.",
    title: "Entrega do webhook",
  },
  {
    description:
      "A versao do estado e monotona. Eventos atrasados nao devem sobrescrever uma versao mais nova ja processada.",
    title: "Eventos fora de ordem",
  },
  {
    description:
      "Uma falha do provedor nao inicia atendimento humano. Aguarde um envio aceito ou uma sessao atualizada pelo V2.",
    title: "Falha no envio humano",
  },
] as const;
