export const webhookEvents = [
  {
    code: `{
  "event": "message",
  "timestamp": "2026-07-07T12:00:00.000Z",
  "instanceName": "Loja Premium",
  "connectionId": "24000000-0000-4000-8000-000000000101",
  "connectionUuid": "24000000-0000-4000-8000-000000000101",
  "connectionPhone": "5511999999999",
  "connection": {
    "id": "24000000-0000-4000-8000-000000000101",
    "uuid": "24000000-0000-4000-8000-000000000101",
    "provider": "zapi",
    "status": "active",
    "phone": "5511999999999"
  },
  "chat": { "phone": "5511888887777", "buyerName": "Ana Premium", "profilePhotoUrl": null, "whatsappLid": null },
  "session": {
    "id": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
    "uuid": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
    "leadId": "0b6ec94e-3bd8-4782-a8bb-7de0f0afae6f",
    "status": "ACTIVE",
    "isBotActive": true,
    "assignedUserId": null,
    "messageCount": 14,
    "tags": [{ "id": "7d42160d-2174-48c9-bd34-4c506d2f5f1d", "name": "Oferta enviada", "color": "green", "emoji": null }]
  },
  "message": {
    "id": "5f9c1c62-c87f-47c2-a2f9-854c843c449a",
    "uuid": "5f9c1c62-c87f-47c2-a2f9-854c843c449a",
    "type": "text",
    "direction": "inbound",
    "fromMe": false,
    "timestamp": "2026-07-07T12:00:00.000Z",
    "wasSentByApi": false,
    "senderOrigin": "customer",
    "content": "Tenho interesse no Civic.",
    "mediaType": null,
    "mediaUrl": null,
    "providerMessageId": "provider-message-123"
  },
  "actionsApi": { "baseUrl": "https://api.exemplo.com/api/v1/crm/whatsapp/integrations/bot/actions", "authentication": "X-Webhook-Secret" }
}`,
    description:
      "Mensagem recebida ou enviada por CRM, WhatsApp humano, bot API ou sistema.",
    event: "message",
  },
  {
    code: `{
  "event": "intervention_started",
  "timestamp": "2026-07-07T12:04:00.000Z",
  "instanceName": "Loja Premium",
  "connectionId": "24000000-0000-4000-8000-000000000101",
  "connectionUuid": "24000000-0000-4000-8000-000000000101",
  "connectionPhone": "5511999999999",
  "connection": { "id": "24000000-0000-4000-8000-000000000101", "uuid": "24000000-0000-4000-8000-000000000101", "provider": "zapi", "status": "active", "phone": "5511999999999" },
  "chat": { "phone": "5511888887777", "buyerName": "Ana Premium", "profilePhotoUrl": null, "whatsappLid": null },
  "session": {
    "id": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
    "uuid": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
    "leadId": "0b6ec94e-3bd8-4782-a8bb-7de0f0afae6f",
    "status": "HUMAN_TAKEOVER",
    "isBotActive": false,
    "assignedUserId": null,
    "messageCount": 15,
    "tags": [{ "id": "7d42160d-2174-48c9-bd34-4c506d2f5f1d", "name": "Oferta enviada", "color": "green", "emoji": null }]
  },
  "intervention": { "active": true, "reason": "ADMIN_INTERVENTION", "triggeredBy": "human", "startedAt": "2026-07-07T12:04:00.000Z", "endedAt": null, "durationSeconds": null, "messageCount": 0, "summary": null },
  "actionsApi": { "baseUrl": "https://api.exemplo.com/api/v1/crm/whatsapp/integrations/bot/actions", "authentication": "X-Webhook-Secret" }
}`,
    description:
      "O bot deve pausar respostas automaticas; mensagens regulares deixam de ser encaminhadas.",
    event: "intervention_started",
  },
  {
    code: `{
  "event": "intervention_ended",
  "timestamp": "2026-07-07T12:18:00.000Z",
  "instanceName": "Loja Premium",
  "connectionId": "24000000-0000-4000-8000-000000000101",
  "connectionUuid": "24000000-0000-4000-8000-000000000101",
  "connectionPhone": "5511999999999",
  "connection": { "id": "24000000-0000-4000-8000-000000000101", "uuid": "24000000-0000-4000-8000-000000000101", "provider": "zapi", "status": "active", "phone": "5511999999999" },
  "chat": { "phone": "5511888887777", "buyerName": "Ana Premium", "profilePhotoUrl": null, "whatsappLid": null },
  "session": {
    "id": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
    "uuid": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
    "leadId": "0b6ec94e-3bd8-4782-a8bb-7de0f0afae6f",
    "status": "ACTIVE",
    "isBotActive": true,
    "assignedUserId": null,
    "messageCount": 21,
    "tags": [{ "id": "7d42160d-2174-48c9-bd34-4c506d2f5f1d", "name": "Oferta enviada", "color": "green", "emoji": null }]
  },
  "intervention": { "active": false, "reason": "bot_action", "triggeredBy": "bot", "startedAt": "2026-07-07T12:04:00.000Z", "endedAt": "2026-07-07T12:18:00.000Z", "durationSeconds": 840, "messageCount": 6, "summary": "Cliente combinou visita amanha as 15h." },
  "actionsApi": { "baseUrl": "https://api.exemplo.com/api/v1/crm/whatsapp/integrations/bot/actions", "authentication": "X-Webhook-Secret" }
}`,
    description:
      "Inclui handback summary para o bot retomar a conversa com contexto.",
    event: "intervention_ended",
  },
  {
    code: `{
  "event": "connection_status_changed",
  "timestamp": "2026-07-07T12:20:00.000Z",
  "instanceName": "Loja Premium",
  "connectionId": "24000000-0000-4000-8000-000000000101",
  "connectionUuid": "24000000-0000-4000-8000-000000000101",
  "connectionPhone": "5511999999999",
  "connection": { "id": "24000000-0000-4000-8000-000000000101", "uuid": "24000000-0000-4000-8000-000000000101", "provider": "zapi", "status": "active", "phone": "5511999999999" },
  "previousStatus": "disconnected",
  "status": "active",
  "reason": "connected",
  "actionsApi": { "baseUrl": "https://api.exemplo.com/api/v1/crm/whatsapp/integrations/bot/actions", "authentication": "X-Webhook-Secret" }
}`,
    description:
      "Mudança de estado da conexão ZAPI. Não inclui chat nem sessão.",
    event: "connection_status_changed",
  },
] as const;
