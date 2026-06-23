import { createElement, useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Store,
  Plus,
  ExternalLink,
  Settings,
  Gem,
  CheckCircle2,
  AlertTriangle,
  Users,
  Trash2,
  Search,
  SlidersHorizontal,
  Calendar,
  X,
  Briefcase,
} from "lucide-react";
import {
  type AgencySort,
  type AgencyStore,
  type AgencyStatusFilter,
  getPlanStatus,
  mapBillingOverviewToStores,
  MOCK_STORES,
} from "./AgencyDashboardPage.model";

export function AgencyDashboardPage() {
  const [stores, setStores] = useState<AgencyStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<AgencySort>("recent");
  const [statusFilter, setStatusFilter] = useState<AgencyStatusFilter>("all");
  const [planEndDateFrom, setPlanEndDateFrom] = useState("");
  const [planEndDateTo, setPlanEndDateTo] = useState("");
  const [storeToDelete, setStoreToDelete] = useState<AgencyStore | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const navigate = useNavigate();

  const triggerToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch billing allocations / overview to load store lists
      const res = await fetch("/api/v1/billing/overview");
      if (res.ok) {
        const mapped = mapBillingOverviewToStores(await res.json());
        if (mapped) {
          setStores(mapped.length > 0 ? mapped : MOCK_STORES);
        } else {
          setStores(MOCK_STORES);
        }
      } else {
        setStores(MOCK_STORES);
      }
    } catch (error) {
      console.error("Error fetching stores, falling back to mock data:", error);
      setStores(MOCK_STORES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleDeleteAccess() {
    if (!storeToDelete) return;
    setIsDeleting(true);
    try {
      // Simulate revoke access success
      await new Promise((resolve) => setTimeout(resolve, 1000));
      triggerToast(
        "success",
        `Acesso à loja ${storeToDelete.nome_da_loja} revogado com sucesso`,
      );
      setStores((prev) => prev.filter((s) => s.id !== storeToDelete.id));
      setStoreToDelete(null);
    } catch {
      triggerToast("error", "Erro ao revogar acesso");
    } finally {
      setIsDeleting(false);
    }
  }

  const filteredAndSortedStores = stores
    .filter((store) => {
      const search = searchTerm.toLowerCase();
      const storeName = (
        store.settings?.profile_name || store.nome_da_loja
      ).toLowerCase();
      const subdomain = store.subdominio.toLowerCase();

      const matchesSearch =
        storeName.includes(search) || subdomain.includes(search);
      if (!matchesSearch) return false;

      if (statusFilter !== "all") {
        const endDate = new Date(store.plan_end_date);
        const now = new Date();
        const isExpired = endDate.getTime() <= now.getTime();
        const isActiveStatus =
          store.status_assinatura.toUpperCase() === "ATIVA";
        const daysLeft = Math.ceil(
          (endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        );

        switch (statusFilter) {
          case "active":
            if (!isActiveStatus || isExpired || daysLeft <= 5) return false;
            break;
          case "expiring":
            if (!isActiveStatus || daysLeft <= 0 || daysLeft > 5) return false;
            break;
          case "expired":
            if (!isActiveStatus || !isExpired || daysLeft <= -7) return false;
            break;
          case "inactive":
            if (isActiveStatus && (!isExpired || daysLeft > -7)) return false;
            break;
        }
      }

      if (planEndDateFrom || planEndDateTo) {
        const planDate = new Date(store.plan_end_date);
        if (planEndDateFrom && planDate < new Date(planEndDateFrom))
          return false;
        if (planEndDateTo && planDate > new Date(planEndDateTo)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "status": {
          const getStatusPriority = (store: AgencyStore) => {
            const endDate = new Date(store.plan_end_date);
            const now = new Date();
            const isExpired = endDate.getTime() <= now.getTime();
            const isActive = store.status_assinatura.toUpperCase() === "ATIVA";
            const daysLeft = Math.ceil(
              (endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
            );

            if (!isActive || (isExpired && daysLeft <= -7)) return 3;
            if (isExpired) return 2;
            if (daysLeft <= 5) return 1;
            return 0;
          };
          return getStatusPriority(a) - getStatusPriority(b);
        }
        case "alphabetical":
          return (a.settings?.profile_name || a.nome_da_loja).localeCompare(
            b.settings?.profile_name || b.nome_da_loja,
          );
        case "vehicles":
          return (b._count?.veiculos || 0) - (a._count?.veiculos || 0);
        case "oldest":
          return (
            new Date(a.data_criacao).getTime() -
            new Date(b.data_criacao).getTime()
          );
        case "recent":
        default:
          return (
            new Date(b.data_criacao).getTime() -
            new Date(a.data_criacao).getTime()
          );
      }
    });

  return (
    <div className="mx-auto flex w-full max-w-[var(--layout-content-max)] flex-col gap-8 px-4 py-8 animate-fade-in">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={
            "fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border text-sm font-bold animate-fade-in " +
            (toastMessage.type === "success"
              ? "bg-accent-soft text-accent border-accent/20"
              : "bg-danger/10 text-danger border-danger/20")
          }
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="size-5 shrink-0" />
          ) : (
            <AlertTriangle className="size-5 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header View */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-accent">
            Visão Geral
          </span>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary mt-1">
            Rede de Lojas
          </h1>
          <p className="text-muted text-sm font-semibold mt-1">
            Central de monitoramento, planos, acessos e faturamento das suas
            concessionárias.
          </p>
        </div>

        <button
          onClick={() => void navigate("/agency/admin/create-store")}
          className="btn-gradient"
        >
          <Plus className="size-5" />
          <span>Criar Nova Loja</span>
        </button>
      </div>

      {/* Stats Counter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="agency-card p-6 flex items-center justify-between bg-gradient-to-br from-panel to-app-elevated">
          <div>
            <span className="text-[10px] font-black uppercase text-muted tracking-wider">
              Total de Lojas
            </span>
            <h3 className="text-3xl font-black italic tracking-tighter mt-1 text-primary">
              {stores.length}
            </h3>
          </div>
          <div className="size-12 rounded-2xl bg-blue-soft text-blue-start flex items-center justify-center font-bold">
            <Store className="size-6" />
          </div>
        </div>

        <div className="agency-card p-6 flex items-center justify-between bg-gradient-to-br from-panel to-app-elevated">
          <div>
            <span className="text-[10px] font-black uppercase text-muted tracking-wider">
              Total de Veículos
            </span>
            <h3 className="text-3xl font-black italic tracking-tighter mt-1 text-primary">
              {stores.reduce(
                (acc, curr) => acc + (curr._count?.veiculos || 0),
                0,
              )}
            </h3>
          </div>
          <div className="size-12 rounded-2xl bg-accent-soft text-accent flex items-center justify-center font-bold">
            <Briefcase className="size-6" />
          </div>
        </div>

        <div className="agency-card p-6 flex items-center justify-between bg-gradient-to-br from-panel to-app-elevated">
          <div>
            <span className="text-[10px] font-black uppercase text-muted tracking-wider">
              Ativas
            </span>
            <h3 className="text-3xl font-black italic tracking-tighter mt-1 text-green-end">
              {stores.filter((s) => s.status_assinatura === "ATIVA").length}
            </h3>
          </div>
          <div className="size-12 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center font-bold">
            <CheckCircle2 className="size-6" />
          </div>
        </div>

        <div className="agency-card p-6 flex items-center justify-between bg-gradient-to-br from-panel to-app-elevated">
          <div>
            <span className="text-[10px] font-black uppercase text-muted tracking-wider">
              Planos Premium
            </span>
            <h3 className="text-3xl font-black italic tracking-tighter mt-1 text-violet-start">
              {
                stores.filter(
                  (s) =>
                    s.plano.includes("PREMIUM") ||
                    s.plano.includes("ENTERPRISE"),
                ).length
              }
            </h3>
          </div>
          <div className="size-12 rounded-2xl bg-violet-500/10 text-violet-start flex items-center justify-center font-bold">
            <Gem className="size-6" />
          </div>
        </div>
      </div>

      {/* Main Table Filter Card */}
      <div className="agency-card">
        {/* Table Filters Toolbar */}
        <div className="p-6 border-b border-line bg-panel/50 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-soft text-accent rounded-xl">
              <Store className="size-5" />
            </div>
            <h2 className="text-lg font-black uppercase italic tracking-wider text-primary">
              Nossas Lojas ({filteredAndSortedStores.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:flex xl:items-center gap-3 flex-1 xl:max-w-4xl justify-end">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted size-4" />
              <input
                type="text"
                placeholder="Buscar loja ou subdomínio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-app border border-line focus:border-accent/40 rounded-xl text-sm font-semibold outline-none transition-all"
              />
            </div>

            {/* Sort Select */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as AgencySort)}
                className="w-full pl-4 pr-9 py-2.5 bg-app border border-line focus:border-accent/40 rounded-xl text-xs font-black uppercase tracking-wider outline-none appearance-none cursor-pointer"
              >
                <option value="recent">Mais Recentes</option>
                <option value="oldest">Mais Antigas</option>
                <option value="alphabetical">Ordem A-Z</option>
                <option value="vehicles">Mais Estoque</option>
                <option value="status">Por Status</option>
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                <SlidersHorizontal className="size-3.5" />
              </div>
            </div>

            {/* Status Select */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as AgencyStatusFilter)
                }
                className="w-full pl-4 pr-9 py-2.5 bg-app border border-line focus:border-accent/40 rounded-xl text-xs font-black uppercase tracking-wider outline-none appearance-none cursor-pointer"
              >
                <option value="all">Todos Status</option>
                <option value="active">Ativas</option>
                <option value="expiring">Vencem em Breve</option>
                <option value="expired">Expiradas</option>
                <option value="inactive">Inativas</option>
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                <SlidersHorizontal className="size-3.5" />
              </div>
            </div>

            {/* Date Picker Filter */}
            <div className="flex items-center gap-1.5 bg-app border border-line p-1.5 rounded-xl">
              <Calendar className="text-muted size-3.5 shrink-0 ml-1" />
              <input
                type="date"
                value={planEndDateFrom}
                onChange={(e) => setPlanEndDateFrom(e.target.value)}
                className="bg-transparent border-none text-[11px] font-bold outline-none text-primary w-[110px]"
                title="Término do plano - De"
              />
              <span className="text-muted text-[10px] font-black uppercase">
                até
              </span>
              <input
                type="date"
                value={planEndDateTo}
                onChange={(e) => setPlanEndDateTo(e.target.value)}
                className="bg-transparent border-none text-[11px] font-bold outline-none text-primary w-[110px]"
                title="Término do plano - Até"
              />
              {(planEndDateFrom || planEndDateTo) && (
                <button
                  onClick={() => {
                    setPlanEndDateFrom("");
                    setPlanEndDateTo("");
                  }}
                  className="p-1 hover:bg-line text-muted hover:text-primary rounded-lg transition-all"
                  title="Limpar filtro de data"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            <p className="text-xs font-black uppercase tracking-widest text-muted">
              Carregando Concessionárias...
            </p>
          </div>
        ) : filteredAndSortedStores.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-app-elevated rounded-2xl flex items-center justify-center mb-6">
              <Search className="size-6 text-muted" />
            </div>
            <h3 className="text-lg font-black text-primary mb-1">
              Nenhum resultado encontrado
            </h3>
            <p className="text-muted text-xs font-semibold max-w-sm">
              Não encontramos nenhuma loja que corresponda aos filtros ativos.
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setPlanEndDateFrom("");
                setPlanEndDateTo("");
              }}
              className="mt-6 btn-secondary-flat text-xs"
            >
              Limpar Todos Filtros
            </button>
          </div>
        ) : (
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
                {filteredAndSortedStores.map((store) => {
                  const status = getPlanStatus(store);

                  return (
                    <tr key={store.id} className="group">
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
                            {createElement(status.icon, {
                              className: "size-3.5",
                            })}
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
                          <button
                            onClick={() =>
                              void navigate("/agency/admin/team-access")
                            }
                            className="btn-secondary-flat py-1.5 px-3 text-xs"
                            title="Gerenciar Acessos"
                          >
                            <Users className="size-3.5" />
                            <span className="hidden sm:inline">Acessos</span>
                          </button>

                          <button
                            onClick={() =>
                              void navigate("/agency/admin/unified-billing")
                            }
                            className="btn-secondary-flat py-1.5 px-3 text-xs"
                            title="Gerenciar Plano"
                          >
                            <Gem className="size-3.5" />
                            <span className="hidden sm:inline">Plano</span>
                          </button>

                          <Link
                            to={`/`} // In production redirects to specific store console
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
                            onClick={() => setStoreToDelete(store)}
                            className="p-2.5 bg-panel border border-line text-muted hover:text-danger hover:border-danger/30 rounded-xl transition-all"
                            title="Remover Acesso"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {storeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isDeleting && setStoreToDelete(null)}
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
              <span className="font-black text-primary">
                {storeToDelete.nome_da_loja}
              </span>
              .
              <br />A loja <span className="text-danger font-black">
                NÃO
              </span>{" "}
              será deletada, mas você não poderá mais gerenciá-la por este
              painel.
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => void handleDeleteAccess()}
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
                onClick={() => setStoreToDelete(null)}
                disabled={isDeleting}
                className="w-full py-3.5 bg-app-elevated hover:bg-line text-primary font-black uppercase text-xs tracking-wider rounded-xl transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
