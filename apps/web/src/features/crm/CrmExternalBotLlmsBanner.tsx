import { useState } from "react";
import { Bot, Check, ExternalLink } from "lucide-react";
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

export function CrmExternalBotLlmsBanner({
  className = "",
}: {
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const llmsTxtUrl = readCrmLlmsTxtUrl();

  const handleCopy = () => {
    void navigator.clipboard?.writeText(llmsTxtUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        ) : null}
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
