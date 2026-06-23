import { createElement } from "react";
import { Link, type NavigateFunction } from "react-router-dom";
import {
  AlertTriangle,
  ExternalLink,
  Gem,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import { type AgencyStore, getPlanStatus } from "./AgencyDashboardPage.model";
import {
  AgencyEmptyStores,
  AgencyRowButton,
} from "./AgencyDashboardStoresTableParts";

export function AgencyStoresTable({
  loading,
  stores,
  onClearFilters,
  onDeleteStore,
  navigate,
}: {
  loading: boolean;
  stores: AgencyStore[];
  onClearFilters: () => void;
  onDeleteStore: (store: AgencyStore) => void;
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
              onDeleteStore={onDeleteStore}
              store={store}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AgencyDeleteModal({
  isDeleting,
  onCancel,
  onConfirm,
  store,
}: {
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  store: AgencyStore | null;
}) {
  if (!store) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !isDeleting && onCancel()}
      />
      <div className="relative bg-panel rounded-3xl p-8 max-w-md w-full shadow-2xl border border-line animate-fade-in">
        <div className="size-16 bg-danger/10 text-danger rounded-2xl flex items-center justify-center mb-6 mx-auto">
          <AlertTriangle className="size-8" />
        </div>
        <h3 className="text-xl font-black italic uppercase tracking-tighter text-primary text-center mb-2">
          Confirmar Remoção?
        </h3>
        <p className="text-muted text-center text-xs font-semibold leading-relaxed mb-8">
          Você está prestes a revogar seu acesso de agência à loja{" "}
          <span className="font-black text-primary">{store.nome_da_loja}</span>.
          <br />A loja <span className="text-danger font-black">NÃO</span> será
          deletada, mas você não poderá mais gerenciá-la por este painel.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="w-full py-3.5 bg-danger hover:bg-danger-hover text-white font-black uppercase text-xs tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isDeleting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Trash2 className="size-4" />
                <span>Revogar Acesso Agora</span>
              </>
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="w-full py-3.5 bg-app-elevated hover:bg-line text-primary font-black uppercase text-xs tracking-wider rounded-xl transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function AgencyStoreRow({
  navigate,
  onDeleteStore,
  store,
}: {
  navigate: NavigateFunction;
  onDeleteStore: (store: AgencyStore) => void;
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
          <span className="text-[10px] font-black uppercase text-muted tracking-wider">
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
            icon={<Users className="size-3.5" />}
            label="Acessos"
            onClick={() => void navigate("/agency/admin/team-access")}
            title="Gerenciar Acessos"
          />
          <AgencyRowButton
            icon={<Gem className="size-3.5" />}
            label="Plano"
            onClick={() => void navigate("/agency/admin/unified-billing")}
            title="Gerenciar Plano"
          />
          <Link
            to="/"
            className="p-2.5 bg-panel border border-line text-muted hover:text-accent hover:border-accent/40 rounded-xl transition-all hover:shadow-lg"
            title="Entrar no Admin"
          >
            <Settings className="size-4" />
          </Link>
          <a
            href={`https://${store.subdominio}.lojaveiculos.com.br`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 bg-panel border border-line text-muted hover:text-accent hover:border-accent/40 rounded-xl transition-all hover:shadow-lg"
            title="Ver Site Público"
          >
            <ExternalLink className="size-4" />
          </a>
          <button
            onClick={() => onDeleteStore(store)}
            className="p-2.5 bg-panel border border-line text-muted hover:text-danger hover:border-danger/30 rounded-xl transition-all"
            title="Remover Acesso"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
