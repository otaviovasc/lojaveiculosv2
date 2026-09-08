export const botEndpoint = "POST /api/v1/crm/bot/actions";

export const botDocCards = [
  {
    code: botEndpoint,
    description:
      "Uma chamada executa um unico comando. Respostas trazem actionId, requestId e status; erros trazem code, message e requestId estaveis.",
    icon: "code",
    title: "Endpoint",
  },
  {
    code: "Authorization: Bearer <token>",
    description:
      "Gere o token nesta tela (campo Token da API de acoes). Ele autentica POST /crm/bot/actions, e write-only e nunca e renderizado depois de salvo. X-Webhook-Secret nao e aceito nesta rota; o segredo do webhook apenas assina os eventos entregues.",
    icon: "key",
    title: "Autenticacao",
  },
  {
    code: "CRM_BOT_POLICY_DENIED",
    description:
      "Durante atendimento humano (WAITING_HUMAN ou IN_HUMAN_SERVICE), os efeitos do bot sao bloqueados no servidor ate o atendimento ser concluido pelo CRM.",
    icon: "shield",
    title: "Takeover",
  },
] as const;

export const actionGroups = [
  {
    actions: "message.send_text, message.send_media, message.send_template",
    label: "Envio",
  },
  {
    actions: "fact.record, vehicle_interest.record, conversation.summarize",
    label: "Registro",
  },
  {
    actions: "appointment.create, opportunity.open, task.create",
    label: "Operacao",
  },
  {
    actions: "handoff.request",
    label: "Atendimento",
  },
] as const;

export const importantFieldNotes = [
  {
    description:
      "Tipo do evento entregue ao webhook: message_received, thread_state_changed, connection_state_changed ou human_attendance_changed.",
    title: "type",
  },
  {
    description:
      "Grant de capacidade de uso unico, valido por 90 segundos, que autoriza a acao de resposta junto com grantExpiresAt e authorizedRequestDigest.",
    title: "grant / grantExpiresAt",
  },
  {
    description:
      "Campos do escopo obrigatorio de toda chamada de acao: identificam o tenant, a loja, a integracao, a conexao e a conversa autorizados pelo evento recebido.",
    title: "tenantId / storeId / integrationId / connectionId / threadId",
  },
  {
    description:
      "Comando a executar: action e o nome da acao e payload segue o contrato estrito da acao escolhida.",
    title: "command { action, payload }",
  },
  {
    description:
      "Revisoes esperadas da conversa e do atendimento, recebidas no evento. Se mudarem, a chamada e rejeitada.",
    title: "expectedRevision / expectedAttendanceRevision",
  },
  {
    description:
      "Sha256 em hex (64 caracteres) do JSON canonico da requisicao, com chaves ordenadas e sem capabilityGrant. Deve bater com authorizedRequestDigest do evento.",
    title: "requestDigest",
  },
  {
    description:
      "Chave de idempotencia por requisicao. Reuso com payload diferente retorna CRM_BOT_IDEMPOTENCY_CONFLICT.",
    title: "idempotencyKey",
  },
  {
    description:
      "Em eventos human_attendance_changed: WAITING_HUMAN, IN_HUMAN_SERVICE ou null. Enquanto houver atendimento humano ativo, os efeitos do bot sao bloqueados.",
    title: "payload.humanAttendanceState",
  },
] as const;

export const interventionFlowNotes = [
  {
    description:
      "Quando o atendimento humano comeca, V2 emite human_attendance_changed com payload.humanAttendanceState WAITING_HUMAN ou IN_HUMAN_SERVICE.",
    title: "Aguardando humano",
  },
  {
    description:
      "O bot acompanha o estado pelos eventos human_attendance_changed; nao existe acao para consultar ou alterar a intervencao.",
    title: "Atendimento iniciado",
  },
  {
    description:
      "Durante o atendimento humano, chamadas de acao sao negadas com CRM_BOT_POLICY_DENIED (403).",
    title: "Bloqueio",
  },
  {
    description:
      "Quando o atendimento e concluido no CRM, V2 emite human_attendance_changed com payload.humanAttendanceState null e o bot pode voltar a agir com um novo grant.",
    title: "Handback",
  },
] as const;

export const interventionNotes = [
  {
    description:
      "Todo estado de atendimento chega por eventos human_attendance_changed; o bot nao precisa (e nao pode) consultar a sessao.",
    title: "Estado por eventos",
  },
  {
    description:
      "Se o bot tentar agir durante o atendimento humano, recebe erro estavel CRM_BOT_POLICY_DENIED.",
    title: "Bloqueio previsivel",
  },
  {
    description:
      "A devolucao ao fluxo automatico acontece quando o atendimento e concluido pelo CRM; o bot nao pode forcar intervencao nem handback.",
    title: "Retomada pelo CRM",
  },
  {
    description:
      "Use conversation.summarize para registrar um resumo curto de continuidade; ele nao substitui o historico.",
    title: "Resumo de contexto",
  },
] as const;

export const attendanceFieldRows = [
  {
    field: "payload.humanAttendanceState",
    meaning:
      "WAITING_HUMAN, IN_HUMAN_SERVICE ou null. E a fonte canonica para saber se o bot pode agir.",
    type: "string | null",
  },
  {
    field: "payload.humanAttendanceActive",
    meaning:
      "true enquanto houver atendimento humano ativo; os efeitos do bot ficam bloqueados no servidor.",
    type: "boolean",
  },
  {
    field: "payload.humanAttendanceStateVersion",
    meaning:
      "Versao monotona do estado. Ignore eventos com versao menor que a ultima processada para a conversa.",
    type: "number | null",
  },
  {
    field: "payload.summary",
    meaning:
      "Resumo operacional curto enviado junto ao evento, quando disponivel.",
    type: "string",
  },
  {
    field: "expectedAttendanceRevision",
    meaning:
      "Revisao de atendimento que deve ser devolvida na chamada de acao; se mudou, a chamada e rejeitada.",
    type: "number",
  },
] as const;

export const attendanceTransitionRows = [
  {
    event: "Atendimento humano solicitado ou iniciado pelo CRM",
    from: "null",
    to: "WAITING_HUMAN",
  },
  {
    event: "Atendente humano assume a conversa no CRM",
    from: "WAITING_HUMAN | null",
    to: "IN_HUMAN_SERVICE",
  },
  {
    event: "Atendimento concluido no CRM",
    from: "WAITING_HUMAN | IN_HUMAN_SERVICE",
    to: "null",
  },
  {
    event: "Chamada de acao do bot durante atendimento humano",
    from: "qualquer estado",
    to: "sem mudanca (CRM_BOT_POLICY_DENIED)",
  },
] as const;

export const attendanceDegradedNotes = [
  {
    description:
      "Responda 2xx somente depois de persistir o evento. Em timeout ou 5xx, V2 reentrega; use o id do evento para deduplicar.",
    title: "Entrega do webhook",
  },
  {
    description:
      "A versao do estado e monotona. Eventos atrasados nao devem sobrescrever uma versao mais nova ja processada.",
    title: "Eventos fora de ordem",
  },
  {
    description:
      "Grants expiram em 90 segundos e servem para uma unica acao. Se expirar, aguarde o proximo evento com um novo grant.",
    title: "Grant expirado",
  },
] as const;
