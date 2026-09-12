const exampleEventScope = `"id": "7d42160d-2174-48c9-bd34-4c506d2f5f1d",
  "occurredAt": "2026-09-08T12:00:00.000Z",
  "tenantId": "11000000-0000-4000-8000-000000000001",
  "storeId": "22000000-0000-4000-8000-000000000002",
  "integrationId": "33000000-0000-4000-8000-000000000003",
  "connectionId": "24000000-0000-4000-8000-000000000101",
  "threadId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
  "channel": "whatsapp",
  "provider": "zapi",
  "modelVersion": "2026-09-08"`;

const exampleGrant = `"actionClass": "effect",
  "grant": "GRANT_DE_USO_UNICO",
  "grantExpiresAt": "2026-09-08T12:01:30.000Z",
  "authorizedRequestDigest": "9f2a71b4219341ecb09e7a1f0c2d8e559f2a71b4219341ecb09e7a1f0c2d8e55"`;

export const webhookEvents = [
  {
    code: `{
  "type": "message_received",
  ${exampleEventScope},
  ${exampleGrant},
  "payload": {
    "channel": "whatsapp",
    "direction": "inbound",
    "messageRef": "5f9c1c62-c87f-47c2-a2f9-854c843c449a",
    "contactRef": "5511888887777",
    "vehicleRef": "44000000-0000-4000-8000-000000000001"
  }
}`,
    description:
      "Mensagem recebida do cliente. O grant autoriza uma unica acao de resposta em ate 90 segundos, com o requestDigest esperado.",
    event: "message_received",
  },
  {
    code: `{
  "type": "thread_state_changed",
  ${exampleEventScope},
  ${exampleGrant},
  "payload": {
    "channel": "whatsapp",
    "threadState": "ACTIVE",
    "summary": "Conversa reaberta pelo cliente."
  }
}`,
    description:
      "Mudanca de estado da conversa (thread). Use o grant para reagir dentro do prazo.",
    event: "thread_state_changed",
  },
  {
    code: `{
  "type": "human_attendance_changed",
  ${exampleEventScope},
  "actionClass": "notification",
  "grant": null,
  "grantExpiresAt": "2026-09-09T12:00:00.000Z",
  "authorizedRequestDigest": "9f2a71b4219341ecb09e7a1f0c2d8e559f2a71b4219341ecb09e7a1f0c2d8e55",
  "payload": {
    "channel": "whatsapp",
    "humanAttendanceActive": true,
    "humanAttendanceState": "WAITING_HUMAN",
    "humanAttendanceStateVersion": 3
  }
}`,
    description:
      "Atendimento humano iniciado, assumido ou concluido no CRM. humanAttendanceState: WAITING_HUMAN, IN_HUMAN_SERVICE ou null. E uma notificacao (grant null): nao autoriza acoes.",
    event: "human_attendance_changed",
  },
  {
    code: `{
  "type": "connection_state_changed",
  ${exampleEventScope},
  "actionClass": "notification",
  "grant": null,
  "grantExpiresAt": "2026-09-09T12:00:00.000Z",
  "authorizedRequestDigest": "9f2a71b4219341ecb09e7a1f0c2d8e559f2a71b4219341ecb09e7a1f0c2d8e55",
  "payload": {
    "channel": "whatsapp",
    "connectionState": "active"
  }
}`,
    description:
      "Mudanca de estado da conexao do canal. Nao inclui conversa nem autoriza acoes.",
    event: "connection_state_changed",
  },
] as const;
