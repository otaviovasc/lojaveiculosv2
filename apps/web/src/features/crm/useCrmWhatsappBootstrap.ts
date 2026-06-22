import { useEffect, useState } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { hasConnectedWhatsapp, normalizeBootstrap } from "./crmWhatsappModel";
import { asError } from "./crmWhatsappHookSupport";
import type {
  CrmWhatsappAgent,
  CrmWhatsappConnection,
  CrmWhatsappScope,
} from "./crmWhatsappTypes";
import { defaultWhatsappScope } from "./crmWhatsappTypes";

export function useCrmWhatsappBootstrap(api: CrmWhatsappApi) {
  const [agents, setAgents] = useState<CrmWhatsappAgent[]>([]);
  const [connections, setConnections] = useState<CrmWhatsappConnection[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [hasConnection, setHasConnection] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [scope, setScope] = useState<CrmWhatsappScope>(defaultWhatsappScope);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setIsReady(false);
    setError(null);
    void api
      .bootstrap()
      .then((payload) => {
        if (!active) return;
        const bootstrap = normalizeBootstrap(payload);
        setAgents(bootstrap.agents);
        setConnections(bootstrap.connections);
        setHasConnection(hasConnectedWhatsapp(bootstrap.connections));
        setScope(bootstrap.scope);
      })
      .catch((caught) => {
        if (active) {
          setError(asError(caught));
          setScope(defaultWhatsappScope);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
          setIsReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [api]);

  return {
    agents,
    connections,
    error,
    hasConnection,
    isLoading,
    isReady,
    scope,
  };
}
