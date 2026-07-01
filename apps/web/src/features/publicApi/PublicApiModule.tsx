import { KeyRound, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { createPublicApi, type PublicApi } from "./apiClient";
import { PublicApiClientList } from "./PublicApiClientList";
import { PublicApiKeyCreator } from "./PublicApiKeyCreator";
import { PublicApiOverview } from "./PublicApiOverview";
import { PublicApiReferencePanel } from "./PublicApiReferencePanel";
import { createPublicApiOptions } from "./runtimeApi";
import type { PublicApiClient, PublicApiScope, PublicApiStatus } from "./types";

export function PublicApiModule({ api }: { api?: PublicApi }) {
  const publicApi = useMemo(() => api ?? createRuntimePublicApi(), [api]);
  const [clients, setClients] = useState<PublicApiClient[]>([]);
  const [name, setName] = useState("Agente de vendas IA");
  const [scopes, setScopes] = useState<PublicApiScope[]>([
    "inventory.read",
    "lead.create",
    "lead.read",
  ]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [status, setStatus] = useState<PublicApiStatus>({ kind: "loading" });

  const refresh = useCallback(async () => {
    setStatus({ kind: "loading" });
    try {
      setClients((await publicApi.listClients()).clients);
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  }, [publicApi]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createClient = useCallback(async () => {
    setStatus({ kind: "saving" });
    try {
      const created = await publicApi.createClient({ name, scopes });
      setCreatedKey(created.apiKey);
      setClients((current) => [created.client, ...current]);
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  }, [name, publicApi, scopes]);

  const revokeClient = useCallback(
    async (clientId: string) => {
      setStatus({ kind: "saving" });
      try {
        const revoked = await publicApi.revokeClient(clientId);
        setClients((current) =>
          current.map((client) =>
            client.id === revoked.id ? revoked : client,
          ),
        );
        setStatus({ kind: "saved" });
      } catch (error) {
        setStatus({ kind: "error", message: errorMessage(error) });
      }
    },
    [publicApi],
  );

  const copyToClipboard = useCallback((value: string, id: string) => {
    void navigator.clipboard.writeText(value);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1800);
  }, []);

  return (
    <FeaturePageShell
      className="internal-shell public-api-shell"
      variant="content"
    >
      <FeaturePageHeader
        actions={
          <FeatureActionButton
            icon={RefreshCcw}
            isBusy={status.kind === "loading"}
            label="Atualizar"
            onClick={() => void refresh()}
          />
        }
        description="Crie chaves escopadas, veja rotas externas seguras e entregue um contrato pronto para SDKs, agentes de IA, chatbots, CRMs e DMS."
        eyebrow={
          <>
            <KeyRound aria-hidden="true" className="size-4" />
            Public API
          </>
        }
        title="Plataforma de integracoes"
      />

      {status.kind === "error" ? (
        <FeatureAlert className="internal-alert">{status.message}</FeatureAlert>
      ) : null}

      <PublicApiOverview />

      <section className="internal-grid two public-api-main-grid">
        <PublicApiKeyCreator
          copiedId={copiedId}
          createdKey={createdKey}
          name={name}
          onCopy={copyToClipboard}
          onCreate={() => void createClient()}
          onNameChange={setName}
          onScopesChange={setScopes}
          scopes={scopes}
          status={status}
        />
        <PublicApiClientList
          clients={clients}
          onRevoke={(clientId) => void revokeClient(clientId)}
          status={status}
        />
      </section>

      <PublicApiReferencePanel copiedId={copiedId} onCopy={copyToClipboard} />
    </FeaturePageShell>
  );
}

function createRuntimePublicApi(): PublicApi {
  return {
    createClient: async (input) =>
      createPublicApi(await createPublicApiOptions()).createClient(input),
    listClients: async () =>
      createPublicApi(await createPublicApiOptions()).listClients(),
    revokeClient: async (clientId) =>
      createPublicApi(await createPublicApiOptions()).revokeClient(clientId),
  };
}

function errorMessage(error: unknown) {
  return formatApiErrorDisplay(
    error,
    "Nao foi possivel carregar a API publica.",
  );
}
