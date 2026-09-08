const exampleScope = `"tenantId": "11000000-0000-4000-8000-000000000001",
  "storeId": "22000000-0000-4000-8000-000000000002",
  "integrationId": "33000000-0000-4000-8000-000000000003",
  "connectionId": "24000000-0000-4000-8000-000000000101",
  "threadId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
  "channel": "whatsapp",
  "provider": "zapi",
  "modelVersion": "2026-09-08"`;

const exampleAuthorization = `"capabilityGrant": "GRANT_RECEBIDO_NO_EVENTO",
  "expectedRevision": 14,
  "expectedAttendanceRevision": 2,
  "idempotencyKey": "msg-recv-5f9c1c62-send-text",
  "requestDigest": "DIGEST_SHA256_HEX_64_CARACTERES"`;

export const botActionExamples = [
  {
    code: `{
  ${exampleScope},
  ${exampleAuthorization},
  "command": {
    "action": "message.send_text",
    "payload": { "text": "Ola! Posso ajudar com esse veiculo?" }
  }
}`,
    description:
      "Envia texto na conversa autorizada. capabilityGrant, revisoes e requestDigest vem do evento recebido no webhook.",
    title: "message.send_text",
  },
  {
    code: `{
  ${exampleScope},
  ${exampleAuthorization},
  "command": {
    "action": "message.send_media",
    "payload": {
      "mediaType": "image/jpeg",
      "mediaUrl": "https://cdn.exemplo.com/civic.jpg",
      "caption": "Foto do veiculo"
    }
  }
}`,
    description:
      "Envia midia por URL publica. caption e opcional; base64 nao e aceito.",
    title: "message.send_media",
  },
  {
    code: `{
  ${exampleScope},
  ${exampleAuthorization},
  "command": {
    "action": "message.send_template",
    "payload": {
      "templateName": "confirmacao_visita",
      "language": "pt_BR",
      "variables": { "nome": "Ana", "horario": "15h" }
    }
  }
}`,
    description:
      "Envia template aprovado do WhatsApp. language e sempre pt_BR e variables e um mapa de strings.",
    title: "message.send_template",
  },
  {
    code: `{
  ${exampleScope},
  ${exampleAuthorization},
  "command": {
    "action": "appointment.create",
    "payload": {
      "startsAt": "2026-09-09T18:00:00.000Z",
      "summary": "Visita para avaliar o Civic."
    }
  }
}`,
    description:
      "Cria um agendamento para a conversa. startsAt usa ISO 8601 com offset; summary e opcional.",
    title: "appointment.create",
  },
  {
    code: `{
  ${exampleScope},
  ${exampleAuthorization},
  "command": {
    "action": "fact.record",
    "payload": {
      "classification": "troca",
      "summary": "Cliente quer dar um Corolla 2020 na troca."
    }
  }
}`,
    description:
      "Registra um fato classificado sobre a conversa para o time comercial.",
    title: "fact.record",
  },
  {
    code: `{
  ${exampleScope},
  ${exampleAuthorization},
  "command": {
    "action": "handoff.request",
    "payload": { "reason": "Cliente pediu atendimento humano." }
  }
}`,
    description:
      "Solicita transferencia para atendimento humano. Durante o atendimento, novas acoes sao negadas com CRM_BOT_POLICY_DENIED.",
    title: "handoff.request",
  },
] as const;
