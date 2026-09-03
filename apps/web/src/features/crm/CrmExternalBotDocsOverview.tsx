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
  -H "X-Webhook-Secret: SEU_SEGREDO_CONFIGURADO" \\
  -d '{
    "action": "send_text",
    "cycleId": "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
    "payload": {
      "text": "Olá! Sou o assistente virtual da loja. Como posso ajudar?"
    }
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
                Todas as requisições autenticam com o header{" "}
                <code>X-Webhook-Secret</code> e retornam respostas JSON
                estruturadas.
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
                  <span className="crm-bot-http-badge http-200">200 OK</span>
                </td>
                <td>
                  <code>SUCCESS</code>
                </td>
                <td>Ação executada com sucesso e enfileirada no canal.</td>
              </tr>
              <tr>
                <td>
                  <span className="crm-bot-http-badge http-401">
                    401 Unauthorized
                  </span>
                </td>
                <td>
                  <code>CRM_INVALID_BOT_SECRET</code>
                </td>
                <td>
                  O segredo passado no header <code>X-Webhook-Secret</code> é
                  inválido ou ausente.
                </td>
              </tr>
              <tr>
                <td>
                  <span className="crm-bot-http-badge http-403">
                    403 Forbidden
                  </span>
                </td>
                <td>
                  <code>CRM_WHATSAPP_BOT_ACTION_BLOCKED</code>
                </td>
                <td>
                  A sessão está sob <strong>atendimento humano</strong>. Envios
                  são bloqueados até a devolução à IA.
                </td>
              </tr>
              <tr>
                <td>
                  <span className="crm-bot-http-badge http-422">
                    422 Unprocessable
                  </span>
                </td>
                <td>
                  <code>CRM_VALIDATION_ERROR</code>
                </td>
                <td>
                  Payload malformado, URL de mídia inválida ou campos
                  obrigatórios ausentes.
                </td>
              </tr>
              <tr>
                <td>
                  <span className="crm-bot-http-badge http-404">
                    404 Not Found
                  </span>
                </td>
                <td>
                  <code>CRM_CONNECTION_NOT_FOUND</code>
                </td>
                <td>
                  O <code>connectionId</code> ou <code>cycleId</code> informado
                  não existe para a loja.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
