import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  type AgencySort,
  type AgencyStore,
  type AgencyStatusFilter,
  mapBillingOverviewToStores,
  MOCK_STORES,
} from "./AgencyDashboardPage.model";
import {
  AgencyDashboardHeader,
  AgencyStatsGrid,
  AgencyStoresCard,
  AgencyToast,
  type AgencyToastMessage,
} from "./AgencyDashboardControls";
import {
  AgencyDeleteModal,
  AgencyStoresTable,
} from "./AgencyDashboardStoresTable";

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
  const [toastMessage, setToastMessage] = useState<AgencyToastMessage | null>(
    null,
  );
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
      <AgencyToast message={toastMessage} />
      <AgencyDashboardHeader
        onCreate={() => void navigate("/agency/admin/create-store")}
      />
      <AgencyStatsGrid stores={stores} />
      <AgencyStoresCard
        filteredCount={filteredAndSortedStores.length}
        onPlanEndDateFromChange={setPlanEndDateFrom}
        onPlanEndDateToChange={setPlanEndDateTo}
        onSearchTermChange={setSearchTerm}
        onSortByChange={setSortBy}
        onStatusFilterChange={setStatusFilter}
        planEndDateFrom={planEndDateFrom}
        planEndDateTo={planEndDateTo}
        searchTerm={searchTerm}
        sortBy={sortBy}
        statusFilter={statusFilter}
      >
        <AgencyStoresTable
          loading={loading}
          navigate={navigate}
          onClearFilters={() => {
            setSearchTerm("");
            setStatusFilter("all");
            setPlanEndDateFrom("");
            setPlanEndDateTo("");
          }}
          onDeleteStore={setStoreToDelete}
          stores={filteredAndSortedStores}
        />
      </AgencyStoresCard>

      <AgencyDeleteModal
        isDeleting={isDeleting}
        onCancel={() => setStoreToDelete(null)}
        onConfirm={() => void handleDeleteAccess()}
        store={storeToDelete}
      />
    </div>
  );
}
