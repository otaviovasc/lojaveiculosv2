import { Check, Copy, Plug, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { createPublicApi, type PublicApi } from "./apiClient";
import { PublicApiClientList } from "./PublicApiClientList";
import { publicApiBasePath } from "./publicApiCatalog";
import { PublicApiKeyCreator } from "./PublicApiKeyCreator";
import { PublicApiReferencePanel } from "./PublicApiReferencePanel";
import { PublicApiRevokeDialog } from "./PublicApiRevokeDialog";
import {
  createPublicApiOptions,
  readPublicApiDeploymentBaseUrl,
} from "./runtimeApi";
import type { PublicApiClient, PublicApiScope, PublicApiStatus } from "./types";

export function PublicApiModule({ api }: { api?: PublicApi }) {
  const publicApi = useMemo(() => api ?? createRuntimePublicApi(), [api]);
  const deploymentBaseUrl = useMemo(readPublicApiDeploymentBaseUrl, []);
  const apiBaseUrl = `${deploymentBaseUrl.replace(/\/$/, "")}${publicApiBasePath}`;
  const [clients, setClients] = useState<PublicApiClient[]>([]);
  const [name, setName] = useState("Agente de vendas IA");
  const [scopes, setScopes] = useState<PublicApiScope[]>([
    "inventory.read",
    "lead.create",
    "lead.read",
  ]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);
  const [hasLoadedClients, setHasLoadedClients] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<PublicApiClient | null>(
    null,
  );
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [status, setStatus] = useState<PublicApiStatus>({ kind: "loading" });
  const copyTimerRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    setStatus({ kind: "loading" });
    try {
      setClients((await publicApi.listClients()).clients);
      setHasLoadedClients(true);
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  }, [publicApi]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

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
      setRevokeError(null);
      try {
        const revoked = await publicApi.revokeClient(clientId);
        setClients((current) =>
          current.map((client) =>
            client.id === revoked.id ? revoked : client,
          ),
        );
        setRevokeTarget(null);
        setStatus({ kind: "saved" });
      } catch (error) {
        const message = errorMessage(error);
        setRevokeError(message);
        setStatus({ kind: "error", message });
      }
    },
    [publicApi],
  );

  const copyToClipboard = useCallback(async (value: string, id: string) => {
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setCopyFeedback({ kind: "success", message: copySuccessMessage(id) });
    } catch {
      setCopiedId(null);
      setCopyFeedback({
        kind: "error",
        message: "Não foi possível copiar. Selecione o conteúdo manualmente.",
      });
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopiedId(null);
      setCopyFeedback(null);
    }, 2400);
  }, []);

  return (
    <FeaturePageShell mainClassName="public-api-shell">
      <FeaturePageHeader
        actions={
          <>
            <FeatureActionButton
              icon={copiedId === "base-url" ? Check : Copy}
              label="Copiar URL base"
              onClick={() => void copyToClipboard(apiBaseUrl, "base-url")}
              title={apiBaseUrl}
            />
            <FeatureActionButton
              icon={RefreshCcw}
              isBusy={status.kind === "loading"}
              label="Atualizar"
              onClick={() => void refresh()}
              title="Atualizar clientes da Public API"
            />
          </>
        }
        actionsLabel="Ações da Public API"
        description="Crie acessos por finalidade, libere somente os escopos necessários e acompanhe cada integração externa."
        eyebrow={
          <>
            <Plug aria-hidden="true" className="size-4" />
            Integrações
          </>
        }
        title="Public API"
      />

      {status.kind === "error" ? (
        <FeatureAlert className="internal-alert">{status.message}</FeatureAlert>
      ) : null}

      {copyFeedback ? (
        <FeatureAlert
          className="public-api-copy-feedback"
          tone={copyFeedback.kind === "success" ? "success" : "danger"}
        >
          {copyFeedback.message}
        </FeatureAlert>
      ) : null}

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
        hasLoaded={hasLoadedClients}
        onRevoke={(client) => {
          setRevokeError(null);
          setRevokeTarget(client);
        }}
        status={status}
      />

      <PublicApiReferencePanel
        copiedId={copiedId}
        deploymentBaseUrl={deploymentBaseUrl}
        onCopy={copyToClipboard}
      />
      <PublicApiRevokeDialog
        client={revokeTarget}
        error={revokeError}
        isLoading={status.kind === "saving"}
        onClose={() => {
          if (status.kind !== "saving") setRevokeTarget(null);
        }}
        onConfirm={() => {
          if (revokeTarget) void revokeClient(revokeTarget.id);
        }}
      />
    </FeaturePageShell>
  );
}

function copySuccessMessage(id: string) {
  if (id === "base-url") return "URL base copiada.";
  if (id === "created-key") return "Chave copiada com segurança.";
  if (id.includes(":")) return "Exemplo curl copiado.";
  return "Rota do artefato copiada.";
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
    "Não foi possível carregar a API pública.",
  );
}
