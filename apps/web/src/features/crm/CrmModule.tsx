import {
  CircleAlert,
  Inbox,
  LockKeyhole,
  MessageSquareText,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { describeCrmHeaderContract } from "./apiClient";
import {
  getCrmBootstrapState,
  readBridgeTokenRefresh,
  requestBridgeRefresh,
} from "./bridge";
import {
  crmConversations,
  crmFixtureAgent,
  crmFixtureSseStatus,
  crmFixtureToken,
} from "./fixtures";
import {
  AgentPanel,
  BridgePanel,
  ConversationPanel,
  CrmNotice,
  InboxPanel,
  Panel,
} from "./CrmPanels";

export function CrmModule() {
  const bootstrap = useMemo(() => getCrmBootstrapState(window.location), []);
  const [bridgeToken, setBridgeToken] = useState(
    bootstrap.bridgeToken ?? crmFixtureToken,
  );
  const [bridgeEventCount, setBridgeEventCount] = useState(0);
  const headers = describeCrmHeaderContract({
    accessToken: bridgeToken,
    agent: crmFixtureAgent,
  });
  const activeConversation = crmConversations[0];

  if (!activeConversation) {
    return (
      <main className="mx-auto flex max-w-[var(--layout-content-max)] flex-col gap-5 p-4 lg:p-6">
        <CrmNotice icon={<Inbox className="size-5 shrink-0" />}>
          Nenhuma conversa disponivel para esta visualizacao.
        </CrmNotice>
      </main>
    );
  }

  const handleBridgeRefresh = () => {
    requestBridgeRefresh(window.parent);
    setBridgeEventCount((count) => count + 1);
  };

  const handleTokenRefreshPreview = () => {
    const token = readBridgeTokenRefresh({
      bridgeToken: "refreshed.demo.bridge.token",
      type: "CRM_BRIDGE_TOKEN_REFRESH",
    });

    if (token) {
      setBridgeToken(token);
    }
  };

  return (
    <main className="mx-auto flex max-w-[var(--layout-content-max)] flex-col gap-5 p-4 lg:p-6">
      <section className="crm-hero">
        <div className="min-w-0 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-inverse-muted">
            CRM WhatsApp V2
          </p>
          <h2 className="max-w-3xl text-2xl font-black text-inverse lg:text-4xl">
            Atendimento nativo preparado para bridge, agente e eventos.
          </h2>
          <p className="max-w-2xl text-sm font-semibold text-inverse-muted">
            Shell sem chamadas externas: contratos de migracao preservados com
            bootstrap, headers tipados e placeholder SSE auditavel.
          </p>
        </div>
        <div className="crm-hero-status">
          <ShieldCheck aria-hidden="true" className="size-5" />
          <span>
            {bootstrap.mode === "embedded" ? "Embedded" : "Standalone"}
          </span>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.3fr]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <Panel
            title="Login do agente"
            icon={<LockKeyhole className="size-5" />}
          >
            <AgentPanel
              agent={crmFixtureAgent}
              bridgeToken={bridgeToken}
              bootstrap={bootstrap}
            />
          </Panel>

          <Panel title="Bridge e API" icon={<RefreshCcw className="size-5" />}>
            <BridgePanel
              bridgeEventCount={bridgeEventCount}
              headers={headers}
              onBridgeRefresh={handleBridgeRefresh}
              onTokenRefreshPreview={handleTokenRefreshPreview}
            />
          </Panel>
        </div>

        <div className="crm-workspace">
          <Panel title="Inbox" icon={<Inbox className="size-5" />}>
            <InboxPanel conversations={crmConversations} />
          </Panel>

          <Panel
            title="Conversa"
            icon={<MessageSquareText className="size-5" />}
          >
            <ConversationPanel
              conversation={activeConversation}
              sseStatus={crmFixtureSseStatus}
            />
          </Panel>
        </div>
      </section>

      <CrmNotice icon={<CircleAlert className="size-5 shrink-0" />}>
        Sem segredos reais, iframe ou backend: esta fatia so estabelece o
        contrato visual e tipado para a migracao do CRM.
      </CrmNotice>
    </main>
  );
}
