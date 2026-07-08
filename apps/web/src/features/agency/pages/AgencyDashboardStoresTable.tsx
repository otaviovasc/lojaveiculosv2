import { createElement } from "react";
import { type NavigateFunction } from "react-router-dom";
import { ExternalLink, Gem, Settings } from "lucide-react";
import { type AgencyStore, getPlanStatus } from "./AgencyDashboardPage.model";
import {
  AgencyEmptyStores,
  AgencyRowButton,
} from "./AgencyDashboardStoresTableParts";

export function AgencyStoresTable({
  loading,
  stores,
  onClearFilters,
  onManageStore,
  navigate,
}: {
  loading: boolean;
  stores: AgencyStore[];
  onClearFilters: () => void;
  onManageStore: (store: AgencyStore) => void;
  navigate: NavigateFunction;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        <p className="text-xs font-black uppercase tracking-widest text-muted">
          Carregando Concessionárias...
        </p>
      </div>
    );
  }

  if (stores.length === 0) {
    return <AgencyEmptyStores onClearFilters={onClearFilters} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="agency-table">
        <thead>
          <tr>
            <th className="text-left">Loja / Subdomínio</th>
            <th className="text-center">Planos & Status</th>
            <th className="text-center">Estoque</th>
            <th className="text-right">Ações Rápidas</th>
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
            onClick={() => void navigate("/agency/admin/unified-billing")}
            title="Gerenciar Plano"
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
            className="p-2.5 bg-panel border border-line text-muted hover:text-accent hover:border-accent/40 rounded-xl transition-all hover:shadow-lg"
            title="Ver Site Público"
          >
            <ExternalLink className="size-4" />
          </a>
        </div>
      </td>
    </tr>
  );
}
