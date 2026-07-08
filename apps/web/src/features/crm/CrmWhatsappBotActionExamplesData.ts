export const botActionExamples = [
  {
    code: `{
  "action": "send_text",
  "sessionId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
  "payload": { "text": "Ola! Posso ajudar com esse veiculo?" }
}`,
    description: "Envia texto em uma conversa existente.",
    title: "send_text por sessao",
  },
  {
    code: `{
  "action": "send_text",
  "connectionId": "24000000-0000-4000-8000-000000000101",
  "payload": { "phone": "5511888887777", "buyerName": "Ana", "text": "Ola!" }
}`,
    description: "Cria ou reutiliza uma conversa por telefone.",
    title: "send_text por telefone",
  },
  {
    code: `{
  "action": "send_image",
  "sessionId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
  "payload": { "imageUrl": "https://cdn.exemplo.com/civic.jpg", "caption": "Foto do veiculo" }
}`,
    description: "Imagem usa imageUrl remoto. Base64 nao e aceito aqui.",
    title: "send_image",
  },
  {
    code: `{
  "action": "send_audio",
  "sessionId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
  "payload": { "audioUrl": "https://cdn.exemplo.com/audio.mp3" }
}`,
    description:
      "Audio usa audioUrl e e enviado ao ZAPI com processamento async.",
    title: "send_audio",
  },
  {
    code: `{
  "action": "send_document",
  "sessionId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
  "payload": { "documentUrl": "https://cdn.exemplo.com/proposta.pdf", "fileName": "proposta.pdf" }
}`,
    description: "Documento usa documentUrl, fileName e mimeType opcionais.",
    title: "send_document",
  },
  {
    code: `{
  "action": "add_note",
  "sessionId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
  "payload": { "content": "Cliente quer troca com Corolla 2020." }
}`,
    description: "Registra nota no lead V2 ligado a conversa.",
    title: "add_note",
  },
  {
    code: `{
  "action": "schedule_message",
  "sessionId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
  "payload": { "text": "Confirmando sua visita.", "scheduledAt": "2026-07-07T13:00:00.000Z" }
}`,
    description: "Cria um agendamento V2 auditado para a sessao.",
    title: "schedule_message",
  },
  {
    code: `{
  "action": "create_tag",
  "connectionId": "24000000-0000-4000-8000-000000000101",
  "payload": { "name": "Oferta enviada", "color": "green" }
}`,
    description:
      "Cria etiqueta simples de WhatsApp, sem semantica de pipeline.",
    title: "create_tag",
  },
  {
    code: `{
  "action": "assign_tag",
  "sessionId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
  "payload": { "tagId": "7d42160d-2174-48c9-bd34-4c506d2f5f1d" }
}`,
    description: "Atribui etiqueta existente ou resolve por name/tagName.",
    title: "assign_tag",
  },
  {
    code: `{
  "action": "remove_tag",
  "sessionId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
  "payload": { "tagId": "7d42160d-2174-48c9-bd34-4c506d2f5f1d" }
}`,
    description: "Remove uma etiqueta da conversa.",
    title: "remove_tag",
  },
  {
    code: `{
  "action": "list_tags",
  "connectionId": "24000000-0000-4000-8000-000000000101",
  "payload": { "limit": 100 }
}`,
    description: "Lista etiquetas de WhatsApp disponiveis para a loja.",
    title: "list_tags",
  },
  {
    code: `{
  "action": "set_intervention",
  "sessionId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
  "payload": { "enabled": false }
}`,
    description: "O bot pode devolver a conversa ao modo automatico.",
    title: "set_intervention",
  },
  {
    code: `{
  "action": "update_session",
  "sessionId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
  "payload": { "assignedUserId": "02020202-0202-4202-8202-020202020202" }
}`,
    description: "Atualiza campos operacionais permitidos da sessao.",
    title: "update_session",
  },
  {
    code: `{
  "action": "get_session",
  "sessionId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61"
}`,
    description: "Busca a sessao com leadId, status, tags e contadores.",
    title: "get_session",
  },
  {
    code: `{
  "action": "close_session",
  "sessionId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61"
}`,
    description: "Conclui a conversa no CRM.",
    title: "close_session",
  },
  {
    code: `{
  "action": "set_visita",
  "sessionId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
  "payload": { "scheduledAt": "2026-07-08T18:00:00.000Z", "notes": "Avaliacao presencial." }
}`,
    description: "Cria visita ligada ao lead V2 da conversa.",
    title: "set_visita",
  },
  {
    code: `{
  "action": "remove_visita",
  "payload": { "visitId": "3d80218e-f7be-4d8d-bc31-14b78203d7f5" }
}`,
    description: "Cancela uma visita existente.",
    title: "remove_visita",
  },
  {
    code: `{
  "action": "check_connection",
  "connectionId": "24000000-0000-4000-8000-000000000101"
}`,
    description: "Retorna configuracao e status conhecido da conexao ZAPI.",
    title: "check_connection",
  },
] as const;
