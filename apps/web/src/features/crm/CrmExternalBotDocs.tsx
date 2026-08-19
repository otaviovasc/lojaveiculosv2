import { useState } from "react";
import {
  Activity,
  Bot,
  Code2,
  FileJson,
  Layers,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { CrmExternalBotDocsOverview } from "./CrmExternalBotDocsOverview";
import { CrmExternalBotDocsEvents } from "./CrmExternalBotDocsEvents";
import { CrmExternalBotDocsActions } from "./CrmExternalBotDocsActions";
import { CrmExternalBotDocsTakeover } from "./CrmExternalBotDocsTakeover";

type DocSubTab = "overview" | "events" | "actions" | "takeover";

export function CrmExternalBotDocs() {
  const [activeSubTab, setActiveSubTab] = useState<DocSubTab>("overview");

  return (
    <section
      aria-label="Documentação técnica da API de bots"
      className="crm-bot-docs-wrapper"
    >
      {/* Sub-navigation Navbar */}
      <div className="crm-bot-docs-nav">
        <div className="crm-bot-docs-nav-items">
          <button
            aria-selected={activeSubTab === "overview"}
            className={`crm-bot-nav-tab ${
              activeSubTab === "overview" ? "crm-bot-nav-tab-active" : ""
            }`}
            onClick={() => setActiveSubTab("overview")}
            role="tab"
            type="button"
          >
            <Layers aria-hidden="true" className="size-4" />
            <span>Visão Geral & Autenticação</span>
          </button>

          <button
            aria-selected={activeSubTab === "events"}
            className={`crm-bot-nav-tab ${
              activeSubTab === "events" ? "crm-bot-nav-tab-active" : ""
            }`}
            onClick={() => setActiveSubTab("events")}
            role="tab"
            type="button"
          >
            <FileJson aria-hidden="true" className="size-4" />
            <span>Webhooks & Eventos</span>
          </button>

          <button
            aria-selected={activeSubTab === "actions"}
            className={`crm-bot-nav-tab ${
              activeSubTab === "actions" ? "crm-bot-nav-tab-active" : ""
            }`}
            onClick={() => setActiveSubTab("actions")}
            role="tab"
            type="button"
          >
            <Terminal aria-hidden="true" className="size-4" />
            <span>Bot Actions API (Playground)</span>
          </button>

          <button
            aria-selected={activeSubTab === "takeover"}
            className={`crm-bot-nav-tab ${
              activeSubTab === "takeover" ? "crm-bot-nav-tab-active" : ""
            }`}
            onClick={() => setActiveSubTab("takeover")}
            role="tab"
            type="button"
          >
            <ShieldCheck aria-hidden="true" className="size-4" />
            <span>Atendimento Humano</span>
          </button>
        </div>
      </div>

      {/* Render Selected View */}
      <div className="crm-bot-docs-content">
        {activeSubTab === "overview" ? <CrmExternalBotDocsOverview /> : null}
        {activeSubTab === "events" ? <CrmExternalBotDocsEvents /> : null}
        {activeSubTab === "actions" ? <CrmExternalBotDocsActions /> : null}
        {activeSubTab === "takeover" ? <CrmExternalBotDocsTakeover /> : null}
      </div>
    </section>
  );
}
