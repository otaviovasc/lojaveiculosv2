# Rehearsal OLX CRM + Marketplace em staging

Este é o gate operacional antes de liberar a integração OLX multicanal. A OLX
não oferece sandbox: o teste usa uma conta de produção aprovada, dados mínimos e
um anúncio destinado ao rehearsal. Não executar sem autorização explícita do
responsável pela conta.

## Contrato confirmado

- OAuth solicita `basic_user_info autoupload autoservice chat`.
- Callback de staging cadastrado na OLX:
  `https://staging.lojaveiculos.com.br/api/v1/marketplaces/oauth/olx/callback`.
- Leads: `POST https://apps.olx.com.br/autoservice/v1/lead`, com uma URL e token
  próprios por anunciante.
- Chat inbound: webhook individual configurado em
  `POST https://apps.olx.com.br/autoservice/v1/chat`.
- Chat outbound: `POST https://apps.olx.com.br/autoservice/v1/chat/send` com
  `textMessage`, `messageId` e `chatId`.
- IP de saída documentado pela OLX: `54.162.151.93`.
- `senderType` (`account|system`, aceitando a variante observada `buyer`) e
  `origin` (`buyer|seller`) são campos diferentes.

## Pré-flight sem efeitos

1. Confirmar deploy de migration antes da API e workers somente após schema
   compatível.
2. Confirmar `PUBLIC_APP_URL=https://staging.lojaveiculos.com.br`, credenciais
   OLX no secret manager e política de origem do webhook habilitada. Não imprimir
   valores.
3. Confirmar entitlement runtime `crm` para Leads/Chat e entitlement Marketplace
   para estoque. Permissão do ator continua independente do entitlement.
4. Verificar que a central mostra uma autorização OLX e estados independentes
   para Leads, Chat e Estoque.
5. Inspecionar o plano Railway incremental e o diff de variáveis/serviços. Este
   runbook não autoriza aplicar o plano nem mutar produção.

## Rehearsal

1. Iniciar OAuth na central OLX e conferir no consentimento os quatro scopes.
2. Concluir no callback de staging; confirmar `basic_user_info` e vinculação da
   conta ao tenant/store correto sem expor token.
3. Ativar Leads e Chat. Confirmar callbacks individuais e status por capability.
4. Ativar estoque e executar uma sincronização controlada de um anúncio. Uma
   falha aqui não pode pausar Chat/Leads.
5. Enviar um lead real de teste. Confirmar deduplicação, contato/touchpoint e
   nenhuma oportunidade antes da intenção comercial confirmada.
6. Como comprador, iniciar uma mensagem no anúncio. Confirmar `origin=buyer`,
   persistência uma vez, thread OLX correta e composer text-only.
7. Responder uma vez no CRM. Confirmar uso do `chatId` da thread e aceite pelo
   endpoint oficial, sem fallback para Z-API/Meta. Timeout ambíguo deve ficar
   `indeterminate` e não sofrer retry automático.
8. Reenviar o mesmo webhook e um payload divergente com mesmo message ID em
   ambiente controlado. Confirmar dedupe e conflito observável, sem duplicar
   mensagem ou efeito.
9. Pausar Chat e repetir sync; depois pausar Estoque e repetir Chat. Os estados
   precisam permanecer independentes.
10. Revogar a autorização, confirmar degraded state e reautorizar por consentimento
    incremental, preservando auditoria e IDs canônicos.

## Evidência e decisão

Registrar apenas IDs opacos, request IDs, timestamps, códigos estáveis e
screenshots sanitizadas em `1440x900` e `390x844`. Não registrar nomes, telefones,
e-mails, mensagens, tokens, callback secrets ou payload bruto.

O gate passa somente se OAuth, Lead inbound, Chat inbound/outbound e estoque
forem comprovados, sem acoplamento de estados e sem fallback. Se qualquer efeito
ficar ambíguo, interromper novos envios e reconciliar pelo provider; não repetir
a chamada para fabricar sucesso.
