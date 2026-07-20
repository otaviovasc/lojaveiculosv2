import {
  CalendarDays,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
  FeatureLoadingState,
  FeatureStatusBadge,
  type FeatureStatusTone,
} from "../../components/ui/FeatureStates";
import { FeatureRowAction } from "../../components/ui/FeatureTable";
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
            aria-label="Resumo dos clientes"
            className="flex flex-wrap items-center gap-2"
          >
            <FeatureStatusBadge size="dense" tone="success">
              {activeCount} ativos
            </FeatureStatusBadge>
            <FeatureStatusBadge size="dense">
              {clients.length} no total
            </FeatureStatusBadge>
          </div>
        ) : null
      }
      className="public-api-panel"
      description="Identifique cada integração pelo nome, acompanhe os escopos e encerre acessos sem expor segredos."
      icon={<KeyRound aria-hidden="true" className="size-5" />}
      title="Clientes conectados"
    >
      <div className="mt-4">
        {!hasLoaded && status.kind === "loading" ? (
          <FeatureLoadingState
            className="feature-empty"
            icon={LoaderCircle}
            title="Carregando clientes externos"
          />
        ) : null}

        {!hasLoaded && status.kind === "error" ? (
          <FeatureAlert>
            Os clientes externos não puderam ser carregados.
          </FeatureAlert>
        ) : null}

        {hasLoaded && clients.length > 0 ? (
          <div className="public-api-client-list">
            {clients.map((client) => (
              <article className="public-api-client-card" key={client.id}>
                <div className="flex items-center justify-between gap-3">
                  <FeatureStatusBadge
                    size="dense"
                    tone={clientStatusTone(client.status)}
                  >
                    {clientStatusLabel(client.status)}
                  </FeatureStatusBadge>
                  <FeatureRowAction
                    ariaLabel={`Revogar ${client.name}`}
                    disabled={
                      client.status === "revoked" || status.kind === "saving"
                    }
                    icon={Trash2}
                    iconClassName="text-danger"
                    onClick={() => onRevoke(client)}
                    tooltip="Revogar chave"
                  />
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
            ))}
          </div>
        ) : null}

        {hasLoaded && clients.length === 0 ? (
          <FeatureEmptyState
            body="Configure o primeiro acesso acima. Ele aparecerá aqui com os escopos e prefixos de identificação."
            density="compact"
            icon={KeyRound}
            title="Nenhum cliente externo criado."
          />
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

function clientStatusTone(status: PublicApiClientStatus): FeatureStatusTone {
  if (status === "active") return "success";
  if (status === "suspended") return "warning";
  return "danger";
}

function formatClientDate(value: string) {
  return publicApiClientDateFormatter.format(new Date(value));
}
