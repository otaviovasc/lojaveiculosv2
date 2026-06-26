import { KeyRound, Plus, RefreshCcw, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
  FeatureSection,
} from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { createPublicApi, type PublicApi } from "./apiClient";
import { createPublicApiOptions } from "./runtimeApi";
import type { PublicApiClient, PublicApiScope } from "./types";

const scopeOptions: { label: string; scope: PublicApiScope }[] = [
  { label: "Estoque leitura", scope: "inventory.read" },
  { label: "Estoque cadastro", scope: "inventory.create" },
  { label: "Preco", scope: "inventory.update_price" },
  { label: "Descricao", scope: "inventory.update_description" },
  { label: "Status", scope: "inventory.update_status" },
  { label: "Midia", scope: "inventory.media_update" },
  { label: "Reservar", scope: "inventory.reserve" },
  { label: "Vender", scope: "inventory.sell" },
  { label: "Financeiro leitura", scope: "finance.read" },
  { label: "Financeiro escrita", scope: "finance.create" },
  { label: "Leads leitura", scope: "lead.read" },
  { label: "Leads escrita", scope: "lead.create" },
];

export function PublicApiModule({ api }: { api?: PublicApi }) {
  const publicApi = useMemo(() => api ?? createRuntimePublicApi(), [api]);
  const [clients, setClients] = useState<PublicApiClient[]>([]);
  const [name, setName] = useState("Integracao estoque");
  const [scopes, setScopes] = useState<PublicApiScope[]>(["inventory.read"]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [status, setStatus] = useState<PublicApiStatus>({ kind: "loading" });

  const refresh = async () => {
    setStatus({ kind: "loading" });
    try {
      setClients((await publicApi.listClients()).clients);
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const createClient = async () => {
    setStatus({ kind: "saving" });
    try {
      const created = await publicApi.createClient({ name, scopes });
      setCreatedKey(created.apiKey);
      setClients([created.client, ...clients]);
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  const revokeClient = async (clientId: string) => {
    setStatus({ kind: "saving" });
    try {
      const revoked = await publicApi.revokeClient(clientId);
      setClients(
        clients.map((client) => (client.id === revoked.id ? revoked : client)),
      );
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  return (
    <FeaturePageShell className="internal-shell" variant="content">
      <FeaturePageHeader
        actions={
          <FeatureActionButton
            icon={RefreshCcw}
            label="Atualizar"
            onClick={() => void refresh()}
          />
        }
        description="Cada chave herda a loja atual e recebe apenas os escopos escolhidos. Billing, usuarios, auditoria e configuracoes continuam user-only."
        eyebrow={
          <>
            <KeyRound aria-hidden="true" className="size-4" />
            API externa
          </>
        }
        title="Chaves escopadas para integracoes"
      />

      {status.kind === "error" ? (
        <FeatureAlert className="internal-alert">{status.message}</FeatureAlert>
      ) : null}

      <section className="internal-grid two">
        <FeatureSection
          className="internal-panel"
          headerClassName="internal-panel-title"
          icon={<ShieldCheck aria-hidden="true" className="size-5" />}
          title="Nova chave"
        >
          <label className="internal-field">
            <span>Nome</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <div className="internal-scope-grid">
            {scopeOptions.map((option) => (
              <label className="internal-check" key={option.scope}>
                <input
                  checked={scopes.includes(option.scope)}
                  onChange={() => setScopes(toggleScope(scopes, option.scope))}
                  type="checkbox"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <button
            className="internal-primary"
            disabled={
              !name.trim() || scopes.length === 0 || status.kind === "saving"
            }
            onClick={() => void createClient()}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Criar chave
          </button>
          {createdKey ? (
            <div className="internal-secret">
              <small>Chave gerada, visivel somente agora</small>
              <code>{createdKey}</code>
            </div>
          ) : null}
        </FeatureSection>

        <FeatureSection
          className="internal-panel"
          headerClassName="internal-panel-title"
          icon={<KeyRound aria-hidden="true" className="size-5" />}
          title="Clientes ativos"
        >
          <div className="internal-list">
            {clients.map((client) => (
              <div className="internal-row" key={client.id}>
                <div>
                  <strong>{client.name}</strong>
                  <small>
                    {client.status} · {client.scopes.length} escopos ·{" "}
                    {client.keyPrefixes.join(", ") || "sem chave ativa"}
                  </small>
                </div>
                <button
                  aria-label="Revogar chave"
                  className="internal-icon-action danger"
                  disabled={client.status === "revoked"}
                  onClick={() => void revokeClient(client.id)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            ))}
            {clients.length === 0 ? (
              <p className="internal-muted">Nenhum cliente externo criado.</p>
            ) : null}
          </div>
        </FeatureSection>
      </section>
    </FeaturePageShell>
  );
}

type PublicApiStatus =
  | { kind: "error"; message: string }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "saved" }
  | { kind: "saving" };

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

function toggleScope(scopes: PublicApiScope[], scope: PublicApiScope) {
  return scopes.includes(scope)
    ? scopes.filter((item) => item !== scope)
    : [...scopes, scope].sort();
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
