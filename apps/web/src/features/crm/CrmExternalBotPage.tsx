import { useEffect, useState } from "react";
import { BookOpen, Bot, TriangleAlert } from "lucide-react";
import { FeatureTabs } from "../../components/ui/FeatureTabs";
import { CrmExternalBotDocs } from "./CrmExternalBotDocs";
import { CrmProviderEventIssuesPanel } from "./CrmProviderEventIssuesPanel";
import type { CrmExternalBotView } from "./crmExternalBotView";
import type { CrmRoutingChannel, CrmRoutingPolicy } from "./crmRoutingTypes";
import { CrmExternalBotPolicyOverview } from "./CrmExternalBotPolicyOverview";
import {
  ExternalBotProfilesManager,
  type CrmExternalBotPageProps,
  PermissionNotice,
} from "./CrmExternalBotPageParts";

const integrationViews = [
  { icon: Bot, label: "Configuracao", value: "configuration" },
  { icon: TriangleAlert, label: "Eventos", value: "events" },
  { icon: BookOpen, label: "Referencia", value: "reference" },
] as const;

export function CrmExternalBotPage({
  api,
  canManage,
  canRead,
  canRetry,
}: CrmExternalBotPageProps) {
  const [activeView, setActiveView] =
    useState<CrmExternalBotView>("configuration");
  const [activeChannel, setActiveChannel] =
    useState<CrmRoutingChannel>("whatsapp");
  const [routingPolicy, setRoutingPolicy] = useState<CrmRoutingPolicy | null>(
    null,
  );

  useEffect(() => {
    if (!canManage || typeof api.getRoutingPolicy !== "function") return;
    void api
      .getRoutingPolicy()
      .then(setRoutingPolicy)
      .catch(() => setRoutingPolicy(null));
  }, [api, canManage]);

  return (
    <section className="crm-section">
      <div className="crm-integrations-page">
        <div className="crm-integrations-nav">
          <FeatureTabs
            activeClassName="crm-integrations-tab-active"
            ariaLabel="Areas de integracao"
            className="crm-integrations-tabs"
            onChange={setActiveView}
            optionClassName="crm-integrations-tab"
            options={integrationViews}
            value={activeView}
          />
          <span className="crm-integrations-nav-status">
            "Perfis por conexão"
          </span>
        </div>

        {activeView === "configuration" ? (
          <div aria-label="Configuracao do bot" role="tabpanel">
            {canManage ? (
              <ExternalBotProfilesManager api={api} canManage={canManage} />
            ) : (
              <PermissionNotice />
            )}
            <CrmExternalBotPolicyOverview
              activeChannel={activeChannel}
              onChannelChange={setActiveChannel}
              policy={routingPolicy}
            />
          </div>
        ) : null}

        {activeView === "events" ? (
          <div aria-label="Eventos do provedor" role="tabpanel">
            {canRead ? (
              <CrmProviderEventIssuesPanel
                api={api}
                canRetry={canRetry}
                showHealthyState
              />
            ) : (
              <PermissionNotice message="Seu usuário não tem permissão para visualizar eventos do provedor." />
            )}
          </div>
        ) : null}

        {activeView === "reference" ? (
          <div aria-label="Referencia da integracao" role="tabpanel">
            <CrmExternalBotDocs />
          </div>
        ) : null}
      </div>
    </section>
  );
}
