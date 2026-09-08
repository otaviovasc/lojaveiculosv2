import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Code2,
  Copy,
  KeyRound,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { botDocCards } from "./CrmExternalBotDocsData";
import { CrmExternalBotLlmsBanner } from "./CrmExternalBotLlmsBanner";

export function CrmExternalBotDocsOverview() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = (key: string, text: string) => {
    void navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sampleCurl = `curl -X POST https://sua-loja.lojaveiculos.com/api/v1/crm/bot/actions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer SEU_TOKEN_DE_INTEGRACAO" \\
  -d '{
    "tenantId": "11000000-0000-4000-8000-000000000001",
    "storeId": "22000000-0000-4000-8000-000000000002",
    "integrationId": "33000000-0000-4000-8000-000000000003",
    "connectionId": "24000000-0000-4000-8000-000000000101",
    "threadId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
    "channel": "whatsapp",
    "provider": "zapi",
    "modelVersion": "2026-09-08",
    "capabilityGrant": "GRANT_RECEBIDO_NO_EVENTO",
    "command": {
      "action": "message.send_text",
      "payload": { "text": "Olá! Sou o assistente virtual da loja. Como posso ajudar?" }
    },
    "expectedRevision": 14,
    "expectedAttendanceRevision": 2,
    "idempotencyKey": "msg-recv-5f9c1c62-send-text",
    "requestDigest": "DIGEST_SHA256_HEX_64_CARACTERES"
  }'`;

  return (
    <div className="crm-bot-docs-section">
      {/* Top Quick Info Cards */}
      <div className="crm-bot-overview-grid">
        {botDocCards.map((card) => (
          <article className="crm-bot-overview-card" key={card.title}>
            <div className="crm-bot-overview-header">
              <span className="crm-bot-overview-icon">
                {card.icon === "code" ? <Code2 aria-hidden="true" /> : null}
                {card.icon === "key" ? <KeyRound aria-hidden="true" /> : null}
                {card.icon === "shield" ? (
                  <ShieldCheck aria-hidden="true" />
                ) : null}
              </span>
              <h3>{card.title}</h3>
            </div>
            <code>{card.code}</code>
            <p>{card.description}</p>
          </article>
        ))}
      </div>

      {/* LLMS.txt AI Agents Banner */}
      <CrmExternalBotLlmsBanner />

      {/* Quickstart Callout & cURL Example */}
      <div className="crm-bot-quickstart-card">
        <div className="crm-bot-quickstart-header">
          <div className="crm-bot-quickstart-title">
            <span className="crm-bot-quickstart-icon">
              <Terminal aria-hidden="true" />
            </span>
            <div>
              <h3>Exemplo de Chamada Rápida (cURL)</h3>
              <p>
                Todas as requisições autenticam com{" "}
                <code>Authorization: Bearer &lt;token&gt;</code> e retornam
                respostas JSON estruturadas. O <code>capabilityGrant</code>, as
                revisões e o <code>requestDigest</code> vêm do evento recebido
                no webhook.
              </p>
            </div>
          </div>
          <button
            aria-label="Copiar comando cURL"
            className="crm-bot-copy-btn"
            onClick={() => copyText("curl", sampleCurl)}
            type="button"
          >
            {copiedKey === "curl" ? (
              <>
                <Check
                  aria-hidden="true"
                  className="size-3.5 text-emerald-600"
                />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy aria-hidden="true" className="size-3.5" />
                <span>Copiar cURL</span>
              </>
            )}
          </button>
        </div>
        <pre className="crm-bot-code-block">{sampleCurl}</pre>
      </div>

      {/* Contract & Error Codes Reference Table */}
      <div className="crm-bot-contracts-card">
        <div className="crm-bot-contracts-header">
          <h3>Códigos de Resposta e Erros Padronizados</h3>
          <p>
            A API segue códigos HTTP semânticos e devolve envelopes padronizados
            com <code>code</code>, <code>message</code> e <code>requestId</code>
            .
          </p>
        </div>

        <div className="crm-bot-table-wrap">
          <table className="crm-bot-table">
            <thead>
              <tr>
                <th>Código HTTP</th>
                <th>Código de Erro</th>
                <th>Descrição / Cenário</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="crm-bot-http-badge http-200">
                    200 OK / 202 Accepted
                  </span>
                </td>
                <td>
                  <code>completed | accepted</code>
                </td>
                <td>
                  Ação aceita. O campo <code>status</code> informa o estado; 200
                  quando já está <code>completed</code>, 202 nos demais casos.
                </td>
              </tr>
              <tr>
                <td>
                  <span className="crm-bot-http-badge http-401">
                    401 Unauthorized
                  </span>
                </td>
                <td>
                  <code>CRM_BOT_UNAUTHORIZED</code>
                </td>
                <td>
                  Token Bearer ausente ou inválido. O header{" "}
                  <code>X-Webhook-Secret</code> não é aceito nesta rota.
                </td>
              </tr>
              <tr>
                <td>
                  <span className="crm-bot-http-badge http-403">
                    403 Forbidden
                  </span>
                </td>
                <td>
                  <code>CRM_BOT_POLICY_DENIED | CRM_BOT_GRANT_INVALID</code>
                </td>
                <td>
                  Política do bot negou o comando (inclui{" "}
                  <strong>atendimento humano ativo</strong>) ou o grant é
                  inválido/expirado.
                </td>
              </tr>
              <tr>
                <td>
                  <span className="crm-bot-http-badge http-403">
                    409 Conflict
                  </span>
                </td>
                <td>
                  <code>
                    CRM_BOT_IDEMPOTENCY_CONFLICT | CRM_BOT_GRANT_REUSED
                  </code>
                </td>
                <td>
                  Idempotency-Key reutilizada com payload diferente ou grant já
                  consumido. Grants são de uso único.
                </td>
              </tr>
              <tr>
                <td>
                  <span className="crm-bot-http-badge http-422">
                    400 Bad Request
                  </span>
                </td>
                <td>
                  <code>VALIDATION_ERROR</code>
                </td>
                <td>
                  Envelope malformado, campos obrigatórios ausentes ou payload
                  fora do contrato estrito da ação.
                </td>
              </tr>
              <tr>
                <td>
                  <span className="crm-bot-http-badge http-404">
                    503 Unavailable
                  </span>
                </td>
                <td>
                  <code>CRM_BOT_UNAVAILABLE</code>
                </td>
                <td>
                  Gerenciador de bots indisponível no momento; repita a chamada
                  mais tarde.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
