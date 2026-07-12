import { KeyRound, LoaderCircle, Trash2 } from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { FeatureLoadingState } from "../../components/ui/FeatureStates";
import type {
  PublicApiClient,
  PublicApiClientStatus,
  PublicApiStatus,
} from "./types";

export function PublicApiClientList({
  clients,
  hasLoaded,
  onRevoke,
  status,
}: {
  clients: PublicApiClient[];
  hasLoaded: boolean;
  onRevoke: (client: PublicApiClient) => void;
  status: PublicApiStatus;
}) {
  return (
    <FeatureSection
      className="internal-panel public-api-panel"
      description="Revogue qualquer cliente comprometido. Prefixos ajudam a identificar chaves sem expor segredo."
      headerClassName="internal-panel-title"
      icon={<KeyRound aria-hidden="true" className="size-5" />}
      title="Clientes"
    >
      <div className="public-api-client-list">
        {!hasLoaded && status.kind === "loading" ? (
          <FeatureLoadingState
            className="public-api-client-state"
            icon={LoaderCircle}
            title="Carregando clientes externos"
          />
        ) : null}
        {!hasLoaded && status.kind === "error" ? (
          <p className="public-api-client-state" role="status">
            Os clientes externos não puderam ser carregados.
          </p>
        ) : null}
        {hasLoaded
          ? clients.map((client) => (
              <article key={client.id}>
                <div className="public-api-client-main">
                  <span data-status={client.status}>
                    {clientStatusLabel(client.status)}
                  </span>
                  <strong>{client.name}</strong>
                  <small>
                    Prefixos:{" "}
                    {client.keyPrefixes.join(", ") || "sem chave ativa"}
                  </small>
                </div>
                <div className="public-api-scope-chips">
                  {client.scopes.map((scope) => (
                    <code key={scope}>{scope}</code>
                  ))}
                </div>
                <button
                  aria-label={`Revogar ${client.name}`}
                  className="internal-icon-action danger"
                  disabled={
                    client.status === "revoked" || status.kind === "saving"
                  }
                  onClick={() => onRevoke(client)}
                  title="Revogar chave"
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </article>
            ))
          : null}
        {hasLoaded && clients.length === 0 ? (
          <p className="internal-muted">Nenhum cliente externo criado.</p>
        ) : null}
      </div>
    </FeatureSection>
  );
}

function clientStatusLabel(status: PublicApiClientStatus) {
  if (status === "active") return "Ativo";
  if (status === "suspended") return "Suspenso";
  return "Revogado";
}
