import {
  CalendarDays,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { FeatureLoadingState } from "../../components/ui/FeatureStates";
import type {
  PublicApiClient,
  PublicApiClientStatus,
  PublicApiStatus,
} from "./types";

const publicApiClientDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

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
  const activeCount = clients.filter(
    (client) => client.status === "active",
  ).length;

  return (
    <FeatureSection
      actions={
        hasLoaded ? (
          <div
            className="public-api-client-summary"
            aria-label="Resumo dos clientes"
          >
            <span>
              <strong>{activeCount}</strong> ativos
            </span>
            <span>
              <strong>{clients.length}</strong> no total
            </span>
          </div>
        ) : null
      }
      className="internal-panel public-api-panel public-api-clients"
      description="Identifique cada integração pelo nome, acompanhe os escopos e encerre acessos sem expor segredos."
      headerClassName="internal-panel-title"
      icon={<KeyRound aria-hidden="true" className="size-5" />}
      title="Clientes conectados"
    >
      <div className="public-api-client-list">
        {!hasLoaded && status.kind === "loading" ? (
          <FeatureLoadingState
            className="public-api-client-state public-api-client-state--loading"
            icon={LoaderCircle}
            title="Carregando clientes externos"
          >
            <span aria-hidden="true" className="public-api-client-skeleton" />
            <span aria-hidden="true" className="public-api-client-skeleton" />
          </FeatureLoadingState>
        ) : null}

        {!hasLoaded && status.kind === "error" ? (
          <p className="public-api-client-state" role="status">
            Os clientes externos não puderam ser carregados.
          </p>
        ) : null}

        {hasLoaded
          ? clients.map((client) => (
              <article key={client.id}>
                <div className="public-api-client-card__header">
                  <span data-status={client.status}>
                    {clientStatusLabel(client.status)}
                  </span>
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
                </div>

                <div className="public-api-client-main">
                  <strong>{client.name}</strong>
                  <small>
                    <KeyRound aria-hidden="true" className="size-3.5" />
                    {client.keyPrefixes.join(", ") || "Sem chave ativa"}
                  </small>
                </div>

                <div className="public-api-scope-chips">
                  {client.scopes.slice(0, 5).map((scope) => (
                    <code key={scope}>{scope}</code>
                  ))}
                  {client.scopes.length > 5 ? (
                    <span>+{client.scopes.length - 5}</span>
                  ) : null}
                </div>

                <footer>
                  <span>
                    <CalendarDays aria-hidden="true" className="size-3.5" />
                    Criado em {formatClientDate(client.createdAt)}
                  </span>
                  <span>
                    <ShieldCheck aria-hidden="true" className="size-3.5" />
                    {client.scopes.length} permissões
                  </span>
                </footer>
              </article>
            ))
          : null}

        {hasLoaded && clients.length === 0 ? (
          <div className="public-api-client-empty">
            <span>
              <KeyRound aria-hidden="true" className="size-5" />
            </span>
            <div>
              <strong>Nenhum cliente externo criado.</strong>
              <small>
                Configure o primeiro acesso acima. Ele aparecerá aqui com os
                escopos e prefixos de identificação.
              </small>
            </div>
          </div>
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

function formatClientDate(value: string) {
  return publicApiClientDateFormatter.format(new Date(value));
}
