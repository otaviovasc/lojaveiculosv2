import { useState } from "react";
import { Bot, Check, Copy, ExternalLink, Sparkles } from "lucide-react";
import { readRuntimeApiBaseUrl } from "../account/runtimeAuth";

export function readCrmLlmsTxtUrl(): string {
  if (typeof window === "undefined") return "/llms.txt";
  const { baseUrl } = readRuntimeApiBaseUrl();
  const resolved = new URL(baseUrl ?? "/api/v1", window.location.origin);
  resolved.pathname = resolved.pathname.replace(/\/api\/v1\/?$/, "");
  resolved.search = "";
  resolved.hash = "";
  return `${resolved.toString().replace(/\/$/, "")}/llms.txt`;
}

interface CrmExternalBotLlmsProps {
  className?: string;
  variant?: "banner" | "compact" | "button";
}

export function CrmExternalBotLlmsBanner({
  className = "",
  variant = "banner",
}: CrmExternalBotLlmsProps) {
  const [copied, setCopied] = useState(false);
  const llmsTxtUrl = readCrmLlmsTxtUrl();

  const handleCopy = () => {
    void navigator.clipboard?.writeText(llmsTxtUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === "button") {
    return (
      <div className={`crm-bot-nav-llms-group ${className}`}>
        <button
          aria-label={
            copied ? "URL do llms.txt copiada" : "Copiar URL do llms.txt"
          }
          className="crm-bot-nav-llms-btn"
          onClick={handleCopy}
          title="Copiar URL do llms.txt para agentes de IA"
          type="button"
        >
          <Bot aria-hidden="true" className="size-4" />
          <span>LLMS.txt</span>
          {copied ? (
            <span className="crm-bot-nav-llms-badge copied">
              <Check aria-hidden="true" className="size-3" />
              Copiado!
            </span>
          ) : (
            <span className="crm-bot-nav-llms-badge">Agentes IA</span>
          )}
        </button>
        <a
          aria-label="Abrir llms.txt em nova aba"
          className="crm-bot-nav-llms-open"
          href={llmsTxtUrl}
          rel="noreferrer"
          target="_blank"
          title="Abrir llms.txt em nova aba"
        >
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </a>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        aria-label="Contratos LLMS.txt para agentes"
        className={`crm-bot-actions-llms-callout ${className}`}
      >
        <div className="crm-bot-actions-llms-left">
          <div className="crm-bot-actions-llms-icon">
            <Bot aria-hidden="true" className="size-4" />
          </div>
          <div className="crm-bot-actions-llms-text">
            <strong>LLMS.txt para Agentes de IA:</strong>
            <span>
              {" "}
              Forneça a especificação completa de ações de bot para ChatGPT,
              Claude ou Cursor.
            </span>
          </div>
        </div>
        <div className="crm-bot-actions-llms-actions">
          <button
            aria-label={
              copied ? "URL do llms.txt copiada" : "Copiar URL do llms.txt"
            }
            className="crm-bot-copy-btn"
            onClick={handleCopy}
            type="button"
          >
            {copied ? (
              <>
                <Check
                  aria-hidden="true"
                  className="size-3.5 text-emerald-600"
                />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy aria-hidden="true" className="size-3.5" />
                <span>Copiar LLMS.txt</span>
              </>
            )}
          </button>
          <a
            aria-label="Abrir llms.txt em nova aba"
            className="crm-bot-llms-open-link"
            href={llmsTxtUrl}
            rel="noreferrer"
            target="_blank"
            title="Abrir llms.txt em nova aba"
          >
            <ExternalLink aria-hidden="true" className="size-3.5" />
            <span>Abrir</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-label="Recurso LLMS.txt para agentes e LLMs"
      className={`crm-bot-llms-banner ${className}`}
    >
      <div className="crm-bot-llms-header-area">
        <span className="crm-bot-llms-icon">
          <Bot aria-hidden="true" className="size-6" />
        </span>
        <div className="crm-bot-llms-info">
          <div className="crm-bot-llms-title-row">
            <h3 className="crm-bot-llms-title">
              LLMS.txt para Agentes de IA & Bots
            </h3>
            <span className="crm-bot-llms-badge">
              <Sparkles aria-hidden="true" className="size-3" />
              Contratos IA
            </span>
          </div>
          <p className="crm-bot-llms-description">
            Especifique rotas, formatos de payload, autenticação e regras de
            takeover diretamente para LLMs e assistentes de código (ChatGPT,
            Claude, Cursor, agentes autônomos).
          </p>
        </div>
      </div>

      <div className="crm-bot-llms-endpoint-row">
        <code>{llmsTxtUrl}</code>
        <button
          aria-label={
            copied ? "URL do llms.txt copiada" : "Copiar URL do llms.txt"
          }
          className="crm-bot-copy-btn"
          onClick={handleCopy}
          type="button"
        >
          {copied ? (
            <>
              <Check aria-hidden="true" className="size-3.5 text-emerald-600" />
              <span>Copiado</span>
            </>
          ) : (
            <>
              <Copy aria-hidden="true" className="size-3.5" />
              <span>Copiar URL</span>
            </>
          )}
        </button>
        <a
          aria-label="Abrir llms.txt em nova aba"
          className="crm-bot-llms-open-link"
          href={llmsTxtUrl}
          rel="noreferrer"
          target="_blank"
          title="Abrir llms.txt em nova aba"
        >
          <ExternalLink aria-hidden="true" className="size-3.5" />
          <span>Abrir</span>
        </a>
      </div>
    </div>
  );
}
