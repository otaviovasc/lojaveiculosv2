import { useMemo, useState } from "react";
import { Bot, Check, Code2, Copy, Play, Search, Terminal } from "lucide-react";
import { botActionExamples } from "./CrmExternalBotActionExamplesData";
import { actionGroups } from "./CrmExternalBotDocsData";

type CodeLang = "curl" | "typescript" | "python" | "json";

export function CrmExternalBotDocsActions() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedActionIndex, setSelectedActionIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeLang, setActiveLang] = useState<CodeLang>("curl");
  const [copied, setCopied] = useState<boolean>(false);

  // Filter actions based on category & search query
  const filteredActions = useMemo(() => {
    return botActionExamples.filter((actionItem) => {
      const matchesSearch =
        actionItem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        actionItem.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        actionItem.code.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (selectedCategory === "all") return true;

      const group = actionGroups.find((g) => g.label === selectedCategory);
      if (!group) return true;

      // check if action is inside group
      const actionName = parseActionName(actionItem.code);
      return group.actions.includes(actionName);
    });
  }, [searchQuery, selectedCategory]);

  const selectedAction =
    filteredActions[selectedActionIndex] ??
    filteredActions[0] ??
    botActionExamples[0];

  function parseActionName(jsonCode: string): string {
    try {
      const parsed: unknown = JSON.parse(jsonCode);
      if (typeof parsed === "object" && parsed !== null && "action" in parsed) {
        return String((parsed as Record<string, unknown>).action ?? "");
      }
      return "";
    } catch {
      return "";
    }
  }

  const generatedCode = useMemo(() => {
    if (!selectedAction) return "";
    const rawJson = selectedAction.code.trim();

    if (activeLang === "json") {
      return rawJson;
    }

    if (activeLang === "curl") {
      return `curl -X POST https://sua-loja.lojaveiculos.com/api/v1/crm/bot/actions \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Secret: SEU_SEGREDO" \\
  -d '${rawJson.replace(/'/g, "'\\''")}'`;
    }

    if (activeLang === "typescript") {
      return `import fetch from "node-fetch";

const payload = ${rawJson};

async function executeBotAction() {
  const response = await fetch("https://sua-loja.lojaveiculos.com/api/v1/crm/bot/actions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": process.env.CRM_WEBHOOK_SECRET || "SEU_SEGREDO",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Bot action error:", data.code, data.message);
    throw new Error(data.message);
  }

  console.log("Action result:", data);
  return data;
}

executeBotAction();`;
    }

    if (activeLang === "python") {
      return `import os
import requests

payload = ${rawJson}

headers = {
    "Content-Type": "application/json",
    "X-Webhook-Secret": os.getenv("CRM_WEBHOOK_SECRET", "SEU_SEGREDO"),
}

response = requests.post(
    "https://sua-loja.lojaveiculos.com/api/v1/crm/bot/actions",
    headers=headers,
    json=payload,
    timeout=10,
)

if response.status_code == 200:
    print("Action successful:", response.json())
else:
    print(f"Error {response.status_code}:", response.json())`;
    }

    return rawJson;
  }, [activeLang, selectedAction]);

  const copyGeneratedCode = () => {
    void navigator.clipboard?.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sampleSuccessResponse = `{
  "success": true,
  "action": "${parseActionName(selectedAction.code)}",
  "result": {
    "messageId": "msg_9f2a71b4-2193-41ec-b09e",
    "status": "queued",
    "enqueuedAt": "2026-07-07T12:00:01.000Z"
  }
}`;

  const sampleBlockedResponse = `{
  "success": false,
  "code": "CRM_WHATSAPP_BOT_ACTION_BLOCKED",
  "message": "Ações automáticas estão bloqueadas enquanto a conversa está sob atendimento humano.",
  "requestId": "req_8df283bc9a10",
  "details": {
    "humanAttendanceState": "IN_HUMAN_SERVICE",
    "reason": "HUMAN_TAKEOVER_ACTIVE"
  }
}`;

  return (
    <div className="crm-bot-docs-section">
      {/* Category Pills and Search Filter */}
      <div className="crm-bot-actions-filter-card">
        <div className="crm-bot-actions-filter-top">
          <div className="crm-bot-actions-categories">
            <button
              className={`crm-bot-category-pill ${
                selectedCategory === "all" ? "crm-bot-category-pill-active" : ""
              }`}
              onClick={() => {
                setSelectedCategory("all");
                setSelectedActionIndex(0);
              }}
              type="button"
            >
              Todas as Ações ({botActionExamples.length})
            </button>
            {actionGroups.map((group) => (
              <button
                className={`crm-bot-category-pill ${
                  selectedCategory === group.label
                    ? "crm-bot-category-pill-active"
                    : ""
                }`}
                key={group.label}
                onClick={() => {
                  setSelectedCategory(group.label);
                  setSelectedActionIndex(0);
                }}
                type="button"
              >
                {group.label}
              </button>
            ))}
          </div>

          <div className="crm-bot-search-box">
            <Search aria-hidden="true" className="size-4 text-muted" />
            <input
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedActionIndex(0);
              }}
              placeholder="Buscar ação (ex: send_text, note...)"
              type="search"
              value={searchQuery}
            />
          </div>
        </div>
      </div>

      {/* Main Two-Column Playground Layout */}
      <div className="crm-bot-playground-layout">
        {/* Left Column: Action List */}
        <div className="crm-bot-action-picker-list">
          {filteredActions.map((item, index) => {
            const isSelected =
              selectedAction.title === item.title ||
              selectedActionIndex === index;
            const actionName = parseActionName(item.code);
            return (
              <button
                className={`crm-bot-picker-item ${
                  isSelected ? "crm-bot-picker-item-active" : ""
                }`}
                key={item.title}
                onClick={() => setSelectedActionIndex(index)}
                type="button"
              >
                <div className="crm-bot-picker-item-top">
                  <code>{actionName || item.title}</code>
                  <span className="crm-bot-picker-tag">POST</span>
                </div>
                <p>{item.description}</p>
              </button>
            );
          })}
          {filteredActions.length === 0 ? (
            <div className="crm-bot-picker-empty">
              <p>Nenhuma ação encontrada para a busca.</p>
            </div>
          ) : null}
        </div>

        {/* Right Column: Code Generator & Preview */}
        <div className="crm-bot-action-detail-panel">
          <div className="crm-bot-detail-header">
            <div>
              <h3>{selectedAction.title}</h3>
              <p>{selectedAction.description}</p>
            </div>

            {/* Language Switcher Tabs */}
            <div className="crm-bot-lang-tabs">
              {(
                [
                  { id: "curl", label: "cURL" },
                  { id: "typescript", label: "TypeScript" },
                  { id: "python", label: "Python" },
                  { id: "json", label: "JSON" },
                ] as const
              ).map((lang) => (
                <button
                  className={`crm-bot-lang-tab ${
                    activeLang === lang.id ? "crm-bot-lang-tab-active" : ""
                  }`}
                  key={lang.id}
                  onClick={() => setActiveLang(lang.id)}
                  type="button"
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Code Viewer */}
          <div className="crm-bot-code-container">
            <div className="crm-bot-code-toolbar">
              <span className="crm-bot-code-lang-label">
                {activeLang.toUpperCase()} EXECUTABLE REQUEST
              </span>
              <button
                aria-label="Copiar código"
                className="crm-bot-copy-btn"
                onClick={copyGeneratedCode}
                type="button"
              >
                {copied ? (
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
                    <span>Copiar código</span>
                  </>
                )}
              </button>
            </div>
            <pre className="crm-bot-code-block">{generatedCode}</pre>
          </div>

          {/* Expected Response Previews */}
          <div className="crm-bot-responses-grid">
            <div className="crm-bot-response-card">
              <div className="crm-bot-response-header success">
                <span className="crm-bot-http-badge http-200">200 OK</span>
                <span>Resposta de Sucesso</span>
              </div>
              <pre className="crm-bot-code-block mini">
                {sampleSuccessResponse}
              </pre>
            </div>

            <div className="crm-bot-response-card">
              <div className="crm-bot-response-header blocked">
                <span className="crm-bot-http-badge http-403">
                  403 Bloqueado
                </span>
                <span>Resposta em Atendimento Humano</span>
              </div>
              <pre className="crm-bot-code-block mini">
                {sampleBlockedResponse}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
