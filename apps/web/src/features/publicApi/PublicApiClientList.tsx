import { KeyRound, Trash2 } from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import type { PublicApiClient, PublicApiStatus } from "./types";

export function PublicApiClientList({
  clients,
  onRevoke,
  status,
}: {
  clients: PublicApiClient[];
  onRevoke: (clientId: string) => void;
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
        {clients.map((client) => (
          <article key={client.id}>
            <div className="public-api-client-main">
              <span data-status={client.status}>{client.status}</span>
              <strong>{client.name}</strong>
              <small>
                Prefixos: {client.keyPrefixes.join(", ") || "sem chave ativa"}
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
              disabled={client.status === "revoked" || status.kind === "saving"}
              onClick={() => onRevoke(client.id)}
              title="Revogar chave"
              type="button"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          </article>
        ))}
        {clients.length === 0 ? (
          <p className="internal-muted">Nenhum cliente externo criado.</p>
        ) : null}
      </div>
    </FeatureSection>
  );
}
