import { createElement } from "react";
import { type NavigateFunction } from "react-router-dom";
import { ExternalLink, Gem, SearchX, Settings, Store } from "lucide-react";
import { type AgencyStore, getPlanStatus } from "./AgencyDashboardPage.model";
import {
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../../components/ui/FeatureStates";
import { FeatureActionButton } from "../../../components/ui/FeatureLayout";
import { AgencyRowButton } from "./AgencyDashboardStoresTableParts";

export function AgencyStoresTable({
  hasActiveFilters,
  loading,
  stores,
  onClearFilters,
  onManageStore,
  navigate,
}: {
  hasActiveFilters: boolean;
  loading: boolean;
  stores: AgencyStore[];
  onClearFilters: () => void;
  onManageStore: (store: AgencyStore) => void;
  navigate: NavigateFunction;
}) {
  if (loading) {
    return <FeatureLoadingState title="Carregando concessionárias" />;
  }

  if (stores.length === 0) {
    return (
      <FeatureEmptyState
        action={
          hasActiveFilters ? (
            <FeatureActionButton
              label="Limpar filtros"
              onClick={onClearFilters}
            />
          ) : undefined
        }
        body={
          hasActiveFilters
            ? "Não encontramos nenhuma loja que corresponda aos filtros ativos."
            : "Nenhuma loja vinculada a esta agência ainda. Crie a primeira loja para começar."
        }
        icon={hasActiveFilters ? SearchX : Store}
        title={
          hasActiveFilters
            ? "Nenhum resultado encontrado"
            : "Nenhuma loja na rede"
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="agency-table">
        <thead>
          <tr>
            <th className="text-left">Loja e subdomínio</th>
            <th className="text-center">Plano e status</th>
            <th className="text-center">Estoque</th>
            <th className="text-right">Ações rápidas</th>
          </tr>
        </thead>
        <tbody>
          {stores.map((store) => (
            <AgencyStoreRow
              key={store.id}
              navigate={navigate}
              onManageStore={onManageStore}
              store={store}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgencyStoreRow({
  navigate,
  onManageStore,
  store,
}: {
  navigate: NavigateFunction;
  onManageStore: (store: AgencyStore) => void;
  store: AgencyStore;
}) {
  const status = getPlanStatus(store);

  return (
    <tr className="group">
      <td>
        <div className="flex flex-col">
          <span className="font-black text-primary text-base group-hover:text-accent transition-colors">
            {store.settings?.profile_name || store.nome_da_loja}
          </span>
          <span className="text-muted text-xs font-bold font-mono tracking-tight mt-0.5">
            {store.subdominio}.lojaveiculos.com.br
          </span>
        </div>
      </td>
      <td>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs font-black uppercase text-muted tracking-wider">
            {store.plano}
          </span>
          <div className={`badge-flat ${status.classes}`}>
            {createElement(status.icon, { className: "size-3.5" })}
            <span>{status.label}</span>
          </div>
        </div>
      </td>
      <td className="text-center">
        <span className="inline-flex items-center justify-center px-3 py-1.5 min-w-[36px] bg-app-elevated border border-line text-primary rounded-xl font-black text-sm">
          {store._count?.veiculos || 0}
        </span>
      </td>
      <td>
        <div className="flex items-center justify-end gap-2">
          <AgencyRowButton
            icon={<Gem className="size-3.5" />}
            label="Plano"
            onClick={() =>
              void navigate(
                `/agency/admin/unified-billing?storeId=${encodeURIComponent(store.id)}`,
              )
            }
            title="Gerenciar plano"
          />
          <AgencyRowButton
            icon={<Settings className="size-3.5" />}
            label="Admin"
            onClick={() => onManageStore(store)}
            title="Gerenciar loja no admin"
          />
          <a
            href={`https://${store.subdominio}.lojaveiculos.com.br`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ver site público de ${store.settings?.profile_name || store.nome_da_loja}`}
            className="p-2.5 bg-panel border border-line text-muted hover:text-accent-text hover:border-accent/40 rounded-xl transition-all"
            title="Ver site público"
          >
            <ExternalLink className="size-4" />
          </a>
        </div>
      </td>
    </tr>
  );
}
